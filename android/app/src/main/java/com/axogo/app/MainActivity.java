package com.axogo.app;

import android.Manifest;
import android.app.Activity;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.content.pm.PackageManager;
import android.graphics.Color;
import android.location.LocationManager;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;
import android.os.VibrationEffect;
import android.os.Vibrator;
import android.util.Log;
import android.view.View;
import android.view.Window;
import android.view.WindowManager;
import android.webkit.ConsoleMessage;
import android.webkit.GeolocationPermissions;
import android.webkit.JavascriptInterface;
import android.webkit.ValueCallback;
import android.webkit.WebChromeClient;
import android.webkit.WebResourceRequest;
import android.webkit.WebResourceResponse;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;

import org.json.JSONObject;

import java.io.ByteArrayInputStream;
import java.io.InputStream;
import java.util.HashMap;
import java.util.Locale;
import java.util.Map;

/**
 * Casca nativa do AxoGo: uma WebView que mostra o app (pasta /web),
 * servido de dentro do aparelho. O conteúdo vem do APK ou da última
 * atualização remota baixada pelo Updater.
 */
public class MainActivity extends Activity {
    static final String TAG = "AxoGo";
    static final String HOST = "appassets.androidplatform.net";
    static final String BASE = "https://" + HOST + "/";
    static final int SHELL = 1;
    static final int REQ_LOC = 11;
    static final int REQ_NOTIF = 12;

    WebView web;
    Updater updater;
    boolean pendingTrack;
    long lastCheck;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        updater = new Updater(this);

        web = new WebView(this);
        web.setBackgroundColor(Color.rgb(0xDC, 0xEB, 0xFD));
        web.setOverScrollMode(View.OVER_SCROLL_NEVER);
        web.setVerticalScrollBarEnabled(false);
        web.setHorizontalScrollBarEnabled(false);
        setContentView(web);

        WebSettings s = web.getSettings();
        s.setJavaScriptEnabled(true);
        s.setDomStorageEnabled(true);
        s.setDatabaseEnabled(true);
        s.setMediaPlaybackRequiresUserGesture(false);
        s.setGeolocationEnabled(true);
        s.setAllowFileAccess(false);
        s.setAllowContentAccess(false);
        s.setTextZoom(100);
        s.setSupportZoom(false);
        s.setUserAgentString(s.getUserAgentString() + " AxoGoApp/" + SHELL);

        web.addJavascriptInterface(new Bridge(), "AxoNative");
        web.setWebViewClient(new Client());
        web.setWebChromeClient(new Chrome());
        web.loadUrl(BASE + "index.html");

        lastCheck = System.currentTimeMillis();
        updater.checkAsync(false);
    }

    @Override
    protected void onResume() {
        super.onResume();
        emit("axogo-resume", "{}");
        if (System.currentTimeMillis() - lastCheck > 15 * 60 * 1000L) {
            lastCheck = System.currentTimeMillis();
            updater.checkAsync(false);
        }
    }

    @Override
    protected void onDestroy() {
        try {
            stopService(new Intent(this, TrackService.class));
        } catch (Throwable ignored) { }
        if (web != null) {
            try { web.destroy(); } catch (Throwable ignored) { }
            web = null;
        }
        super.onDestroy();
    }

    @Override
    public void onBackPressed() {
        if (web == null) { moveTaskToBack(true); return; }
        web.evaluateJavascript(
            "(function(){try{return window.AxoGoBack?!!window.AxoGoBack():false}catch(e){return false}})()",
            new ValueCallback<String>() {
                @Override public void onReceiveValue(String v) {
                    if (!"true".equals(v)) moveTaskToBack(true);
                }
            });
    }

    /** Dispara um evento no app web: window.addEventListener(nome, e => e.detail). */
    void emit(final String event, final String json) {
        runOnUiThread(new Runnable() {
            @Override public void run() {
                if (web == null) return;
                try {
                    web.evaluateJavascript("window.dispatchEvent(new CustomEvent('" + event + "',{detail:" + json + "}))", null);
                } catch (Throwable t) { Log.w(TAG, "emit", t); }
            }
        });
    }

    boolean hasLocation() {
        return checkSelfPermission(Manifest.permission.ACCESS_FINE_LOCATION) == PackageManager.PERMISSION_GRANTED
            || checkSelfPermission(Manifest.permission.ACCESS_COARSE_LOCATION) == PackageManager.PERMISSION_GRANTED;
    }

    void askNotifications() {
        if (Build.VERSION.SDK_INT < 33) return;
        if (checkSelfPermission(Manifest.permission.POST_NOTIFICATIONS) == PackageManager.PERMISSION_GRANTED) return;
        SharedPreferences p = getSharedPreferences("axogo", MODE_PRIVATE);
        if (p.getInt("notifAsked", 0) >= 2) return;
        p.edit().putInt("notifAsked", p.getInt("notifAsked", 0) + 1).apply();
        try {
            requestPermissions(new String[]{Manifest.permission.POST_NOTIFICATIONS}, REQ_NOTIF);
        } catch (Throwable t) { Log.w(TAG, "notif perm", t); }
    }

    void beginTracking() {
        if (!hasLocation()) {
            pendingTrack = true;
            TrackService.state = "asking";
            try {
                requestPermissions(new String[]{
                    Manifest.permission.ACCESS_FINE_LOCATION,
                    Manifest.permission.ACCESS_COARSE_LOCATION}, REQ_LOC);
            } catch (Throwable t) {
                TrackService.state = "denied";
            }
            return;
        }
        pendingTrack = false;
        try {
            Intent i = new Intent(this, TrackService.class);
            if (Build.VERSION.SDK_INT >= 26) startForegroundService(i); else startService(i);
            if (TrackService.state.equals("off") || TrackService.state.equals("asking") || TrackService.state.equals("denied")) {
                TrackService.state = "wait";
            }
        } catch (Throwable t) {
            Log.w(TAG, "start track", t);
            TrackService.state = "error";
        }
        try {
            LocationManager lm = (LocationManager) getSystemService(Context.LOCATION_SERVICE);
            if (lm != null && !lm.isProviderEnabled(LocationManager.GPS_PROVIDER)) TrackService.state = "disabled";
        } catch (Throwable ignored) { }
    }

    @Override
    public void onRequestPermissionsResult(int requestCode, String[] permissions, int[] grantResults) {
        super.onRequestPermissionsResult(requestCode, permissions, grantResults);
        if (requestCode == REQ_LOC) {
            if (hasLocation()) {
                if (pendingTrack) beginTracking();
            } else {
                pendingTrack = false;
                TrackService.state = "denied";
            }
            emit("axogo-gps", "{}");
        }
    }

    static String mime(String path) {
        String p = path.toLowerCase(Locale.ROOT);
        if (p.endsWith(".html")) return "text/html";
        if (p.endsWith(".js") || p.endsWith(".mjs")) return "text/javascript";
        if (p.endsWith(".css")) return "text/css";
        if (p.endsWith(".json")) return "application/json";
        if (p.endsWith(".png")) return "image/png";
        if (p.endsWith(".jpg") || p.endsWith(".jpeg")) return "image/jpeg";
        if (p.endsWith(".webp")) return "image/webp";
        if (p.endsWith(".svg")) return "image/svg+xml";
        if (p.endsWith(".woff2")) return "font/woff2";
        if (p.endsWith(".woff")) return "font/woff";
        if (p.endsWith(".mp3")) return "audio/mpeg";
        if (p.endsWith(".txt")) return "text/plain";
        return "application/octet-stream";
    }

    static boolean isText(String mime) {
        return mime.startsWith("text/") || mime.equals("application/json") || mime.equals("image/svg+xml");
    }

    class Client extends WebViewClient {
        @Override
        public WebResourceResponse shouldInterceptRequest(WebView view, WebResourceRequest request) {
            Uri u = request.getUrl();
            if (u == null || !HOST.equalsIgnoreCase(u.getHost())) return null;
            String path = u.getPath();
            if (path == null || path.equals("") || path.equals("/")) path = "/index.html";
            path = path.substring(1);
            Map<String, String> h = new HashMap<String, String>();
            h.put("Cache-Control", "no-store");
            h.put("Access-Control-Allow-Origin", "*");
            InputStream in = null;
            if (!path.contains("..") && !path.contains("\\")) {
                in = updater.open(path);
            }
            if (in == null) {
                return new WebResourceResponse("text/plain", "utf-8", 404, "Not Found", h,
                    new ByteArrayInputStream(new byte[0]));
            }
            String m = mime(path);
            return new WebResourceResponse(m, isText(m) ? "utf-8" : null, 200, "OK", h, in);
        }

        @Override
        public boolean shouldOverrideUrlLoading(WebView view, WebResourceRequest request) {
            Uri u = request.getUrl();
            if (u != null && HOST.equalsIgnoreCase(u.getHost())) return false;
            try {
                startActivity(new Intent(Intent.ACTION_VIEW, u));
            } catch (Throwable t) { Log.w(TAG, "open url", t); }
            return true;
        }
    }

    class Chrome extends WebChromeClient {
        @Override
        public void onGeolocationPermissionsShowPrompt(String origin, GeolocationPermissions.Callback callback) {
            callback.invoke(origin, hasLocation(), false);
        }

        @Override
        public boolean onConsoleMessage(ConsoleMessage m) {
            Log.d(TAG, m.message() + " @" + m.sourceId() + ":" + m.lineNumber());
            return true;
        }
    }

    /** Funções nativas chamadas pelo app web como AxoNative.xxx(). */
    class Bridge {
        @JavascriptInterface
        public String info() {
            try {
                JSONObject o = new JSONObject();
                o.put("shell", SHELL);
                o.put("web", updater.current());
                o.put("bundled", updater.bundled);
                o.put("sdk", Build.VERSION.SDK_INT);
                o.put("updating", updater.busy);
                return o.toString();
            } catch (Throwable t) { return "{}"; }
        }

        @JavascriptInterface
        public void startTracking() {
            runOnUiThread(new Runnable() { @Override public void run() { beginTracking(); } });
        }

        @JavascriptInterface
        public void stopTracking() {
            pendingTrack = false;
            runOnUiThread(new Runnable() {
                @Override public void run() {
                    try { stopService(new Intent(MainActivity.this, TrackService.class)); } catch (Throwable ignored) { }
                    TrackService.state = "off";
                }
            });
        }

        @JavascriptInterface
        public String drainPoints() { return TrackService.drain(); }

        @JavascriptInterface
        public String trackState() { return TrackService.state; }

        @JavascriptInterface
        public void keepAwake(final boolean on) {
            runOnUiThread(new Runnable() {
                @Override public void run() {
                    Window w = getWindow();
                    if (on) w.addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON);
                    else w.clearFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON);
                }
            });
        }

        @JavascriptInterface
        public void setBars(final String color, final boolean darkIcons) {
            runOnUiThread(new Runnable() {
                @Override public void run() {
                    try {
                        Window w = getWindow();
                        w.setStatusBarColor(Color.parseColor(color));
                        View d = w.getDecorView();
                        int f = d.getSystemUiVisibility();
                        if (darkIcons) f |= View.SYSTEM_UI_FLAG_LIGHT_STATUS_BAR;
                        else f &= ~View.SYSTEM_UI_FLAG_LIGHT_STATUS_BAR;
                        d.setSystemUiVisibility(f);
                    } catch (Throwable t) { Log.w(TAG, "bars", t); }
                }
            });
        }

        @JavascriptInterface
        public void vibrate(int ms) {
            try {
                Vibrator v = (Vibrator) getSystemService(Context.VIBRATOR_SERVICE);
                if (v == null) return;
                ms = Math.max(1, Math.min(ms, 2000));
                if (Build.VERSION.SDK_INT >= 26) v.vibrate(VibrationEffect.createOneShot(ms, VibrationEffect.DEFAULT_AMPLITUDE));
                else v.vibrate(ms);
            } catch (Throwable ignored) { }
        }

        @JavascriptInterface
        public void setReminder(int hour, int minute, String days, String title, String text, boolean enabled) {
            try {
                getSharedPreferences("axogo", MODE_PRIVATE).edit()
                    .putInt("remH", hour).putInt("remM", minute)
                    .putString("remDays", days == null ? "" : days)
                    .putString("remTitle", title == null ? "AxoGo" : title)
                    .putString("remText", text == null ? "" : text)
                    .putBoolean("remOn", enabled).apply();
                ReminderReceiver.schedule(MainActivity.this);
                if (enabled) runOnUiThread(new Runnable() { @Override public void run() { askNotifications(); } });
            } catch (Throwable t) { Log.w(TAG, "reminder", t); }
        }

        @JavascriptInterface
        public void markTrained(String dayKey) {
            getSharedPreferences("axogo", MODE_PRIVATE).edit().putString("trained", dayKey == null ? "" : dayKey).apply();
        }

        @JavascriptInterface
        public void checkUpdate() {
            lastCheck = System.currentTimeMillis();
            updater.checkAsync(true);
        }

        @JavascriptInterface
        public void reload() {
            runOnUiThread(new Runnable() {
                @Override public void run() {
                    if (web != null) web.loadUrl(BASE + "index.html");
                }
            });
        }
    }
}
