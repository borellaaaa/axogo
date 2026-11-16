package com.axogo.app;

import android.content.SharedPreferences;
import android.util.Log;

import org.json.JSONArray;
import org.json.JSONObject;

import java.io.ByteArrayOutputStream;
import java.io.File;
import java.io.FileInputStream;
import java.io.FileOutputStream;
import java.io.IOException;
import java.io.InputStream;
import java.io.OutputStream;
import java.net.HttpURLConnection;
import java.net.URL;
import java.security.MessageDigest;

/**
 * Atualização remota do app web.
 * Lê web/manifest.json no GitHub; se a versão for maior que a instalada,
 * baixa só os arquivos que mudaram, confere o SHA-256 de cada um e troca
 * a versão ativa de uma vez. Se algo falhar, a versão atual continua valendo.
 */
class Updater {
    static final String REMOTE = "https://raw.githubusercontent.com/borellaaaa/axogo/main/web/";

    final MainActivity act;
    final SharedPreferences prefs;
    final File root;
    int bundled;
    volatile int active;
    volatile boolean busy;

    Updater(MainActivity a) {
        act = a;
        prefs = a.getSharedPreferences("axogo", MainActivity.MODE_PRIVATE);
        root = new File(a.getFilesDir(), "ota");
        bundled = 0;
        try {
            InputStream in = a.getAssets().open("web/manifest.json");
            bundled = new JSONObject(new String(readAll(in), "UTF-8")).optInt("version", 0);
        } catch (Throwable t) { Log.w(MainActivity.TAG, "manifest do APK", t); }
        int v = prefs.getInt("ota", 0);
        if (v > bundled && new File(dir(v), "index.html").isFile()) active = v; else active = 0;
        // limpa versões antigas e downloads incompletos
        try {
            File[] list = root.listFiles();
            if (list != null) for (File f : list) {
                if (active > 0 && f.getName().equals("v" + active)) continue;
                deleteRec(f);
            }
        } catch (Throwable ignored) { }
    }

    File dir(int v) { return new File(root, "v" + v); }

    int current() { return active > 0 ? active : bundled; }

    /** Abre um arquivo do app web: versão baixada primeiro, senão a que veio no APK. */
    InputStream open(String path) {
        int v = active;
        if (v > 0) {
            File f = new File(dir(v), path);
            if (f.isFile()) {
                try { return new FileInputStream(f); } catch (IOException ignored) { }
            }
        }
        try { return act.getAssets().open("web/" + path); } catch (IOException e) { return null; }
    }

    void checkAsync(final boolean manual) {
        if (busy) { if (manual) act.emit("axogo-update", "{\"status\":\"busy\"}"); return; }
        busy = true;
        new Thread(new Runnable() {
            @Override public void run() {
                try {
                    check(manual);
                } catch (Throwable t) {
                    Log.w(MainActivity.TAG, "update", t);
                    if (manual) act.emit("axogo-update", "{\"status\":\"error\"}");
                } finally {
                    busy = false;
                }
            }
        }, "axogo-update").start();
    }

    void check(boolean manual) throws Exception {
        String txt = new String(http(REMOTE + "manifest.json?t=" + System.currentTimeMillis()), "UTF-8");
        JSONObject m = new JSONObject(txt);
        int v = m.getInt("version");
        if (v <= current()) {
            if (manual) act.emit("axogo-update", "{\"status\":\"none\",\"version\":" + current() + "}");
            return;
        }
        if (m.optInt("minShell", 1) > MainActivity.SHELL) {
            act.emit("axogo-update", "{\"status\":\"shell\",\"version\":" + v + "}");
            return;
        }
        if (manual) act.emit("axogo-update", "{\"status\":\"downloading\",\"version\":" + v + "}");
        File tmp = new File(root, "tmp");
        deleteRec(tmp);
        if (!tmp.mkdirs()) throw new IOException("mkdir tmp");
        JSONArray files = m.getJSONArray("files");
        for (int i = 0; i < files.length(); i++) {
            JSONObject f = files.getJSONObject(i);
            String path = f.getString("path");
            String sha = f.getString("sha256");
            if (path.contains("..") || path.startsWith("/") || path.contains("\\")) throw new IOException("caminho inválido");
            File out = new File(tmp, path);
            File parent = out.getParentFile();
            if (parent != null && !parent.isDirectory() && !parent.mkdirs()) throw new IOException("mkdir");
            boolean ok = false;
            InputStream cur = open(path);
            if (cur != null) {
                byte[] data = readAll(cur);
                if (sha.equalsIgnoreCase(sha256(data))) { write(out, data); ok = true; }
            }
            if (!ok) {
                byte[] data = http(REMOTE + path + "?v=" + sha.substring(0, Math.min(12, sha.length())));
                if (!sha.equalsIgnoreCase(sha256(data))) throw new IOException("sha diferente: " + path);
                write(out, data);
            }
        }
        write(new File(tmp, "manifest.json"), txt.getBytes("UTF-8"));
        File dst = dir(v);
        deleteRec(dst);
        if (!tmp.renameTo(dst)) throw new IOException("rename");
        prefs.edit().putInt("ota", v).commit();
        active = v;
        JSONObject ev = new JSONObject();
        ev.put("status", "ready");
        ev.put("version", v);
        ev.put("notes", m.optString("notes", ""));
        act.emit("axogo-update", ev.toString());
    }

    static byte[] http(String url) throws IOException {
        HttpURLConnection c = (HttpURLConnection) new URL(url).openConnection();
        try {
            c.setConnectTimeout(12000);
            c.setReadTimeout(25000);
            c.setUseCaches(false);
            c.setRequestProperty("Cache-Control", "no-cache");
            c.setRequestProperty("User-Agent", "AxoGoApp/" + MainActivity.SHELL);
            int code = c.getResponseCode();
            if (code != 200) throw new IOException("HTTP " + code);
            return readAll(c.getInputStream());
        } finally {
            c.disconnect();
        }
    }

    static byte[] readAll(InputStream in) throws IOException {
        try {
            ByteArrayOutputStream bo = new ByteArrayOutputStream();
            byte[] b = new byte[16384];
            int n;
            while ((n = in.read(b)) > 0) bo.write(b, 0, n);
            return bo.toByteArray();
        } finally {
            try { in.close(); } catch (IOException ignored) { }
        }
    }

    static void write(File f, byte[] data) throws IOException {
        OutputStream o = new FileOutputStream(f);
        try { o.write(data); } finally { o.close(); }
    }

    static String sha256(byte[] data) throws Exception {
        byte[] d = MessageDigest.getInstance("SHA-256").digest(data);
        StringBuilder sb = new StringBuilder();
        for (byte x : d) sb.append(String.format("%02x", x));
        return sb.toString();
    }

    static void deleteRec(File f) {
        if (f == null || !f.exists()) return;
        File[] kids = f.listFiles();
        if (kids != null) for (File k : kids) deleteRec(k);
        //noinspection ResultOfMethodCallIgnored
        f.delete();
    }
}
