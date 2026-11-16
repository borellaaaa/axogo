package com.axogo.app;

import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.app.Service;
import android.content.Context;
import android.content.Intent;
import android.content.pm.ServiceInfo;
import android.location.Location;
import android.location.LocationListener;
import android.location.LocationManager;
import android.os.Build;
import android.os.Bundle;
import android.os.IBinder;
import android.os.Looper;
import android.os.PowerManager;
import android.util.Log;

import java.util.ArrayList;
import java.util.Locale;

/**
 * Serviço em primeiro plano que registra o GPS durante a corrida/caminhada,
 * inclusive com a tela apagada. Os pontos ficam numa fila que o app web
 * esvazia com AxoNative.drainPoints().
 */
public class TrackService extends Service implements LocationListener {
    static final String CHANNEL = "axogo_track";
    static final ArrayList<double[]> BUF = new ArrayList<double[]>();
    /** off | asking | wait | ok | denied | disabled | error */
    static volatile String state = "off";
    static volatile boolean running;

    LocationManager lm;
    PowerManager.WakeLock wake;

    static String drain() {
        StringBuilder sb = new StringBuilder("[");
        synchronized (BUF) {
            for (int i = 0; i < BUF.size(); i++) {
                double[] p = BUF.get(i);
                if (i > 0) sb.append(',');
                sb.append(String.format(Locale.US, "[%.6f,%.6f,%.1f,%.0f,%.2f]", p[0], p[1], p[2], p[3], p[4]));
            }
            BUF.clear();
        }
        return sb.append(']').toString();
    }

    @Override
    public IBinder onBind(Intent intent) { return null; }

    @Override
    public int onStartCommand(Intent intent, int flags, int startId) {
        try {
            Notification n = buildNotification();
            if (Build.VERSION.SDK_INT >= 29) {
                startForeground(7, n, ServiceInfo.FOREGROUND_SERVICE_TYPE_LOCATION);
            } else {
                startForeground(7, n);
            }
        } catch (Throwable t) {
            Log.w(MainActivity.TAG, "startForeground", t);
            state = "error";
            stopSelf();
            return START_NOT_STICKY;
        }
        if (!running) {
            running = true;
            synchronized (BUF) { BUF.clear(); }
            begin();
        }
        return START_NOT_STICKY;
    }

    void begin() {
        state = "wait";
        lm = (LocationManager) getSystemService(Context.LOCATION_SERVICE);
        try {
            if (lm == null) { state = "error"; return; }
            lm.requestLocationUpdates(LocationManager.GPS_PROVIDER, 1000L, 0f, this, Looper.getMainLooper());
            if (!lm.isProviderEnabled(LocationManager.GPS_PROVIDER)) state = "disabled";
        } catch (SecurityException e) {
            state = "denied";
        } catch (Throwable t) {
            Log.w(MainActivity.TAG, "gps", t);
            state = "error";
        }
        try {
            PowerManager pm = (PowerManager) getSystemService(Context.POWER_SERVICE);
            if (pm != null) {
                wake = pm.newWakeLock(PowerManager.PARTIAL_WAKE_LOCK, "axogo:track");
                wake.setReferenceCounted(false);
                wake.acquire(6 * 60 * 60 * 1000L);
            }
        } catch (Throwable t) { Log.w(MainActivity.TAG, "wakelock", t); }
    }

    Notification buildNotification() {
        NotificationManager nm = (NotificationManager) getSystemService(Context.NOTIFICATION_SERVICE);
        Notification.Builder b;
        if (Build.VERSION.SDK_INT >= 26) {
            NotificationChannel ch = new NotificationChannel(CHANNEL, getString(R.string.ch_track), NotificationManager.IMPORTANCE_LOW);
            ch.setShowBadge(false);
            if (nm != null) nm.createNotificationChannel(ch);
            b = new Notification.Builder(this, CHANNEL);
        } else {
            b = new Notification.Builder(this);
        }
        Intent open = new Intent(this, MainActivity.class).addFlags(Intent.FLAG_ACTIVITY_SINGLE_TOP);
        PendingIntent pi = PendingIntent.getActivity(this, 0, open,
            PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);
        b.setSmallIcon(R.drawable.ic_stat_axo)
            .setContentTitle(getString(R.string.track_title))
            .setContentText(getString(R.string.track_text))
            .setColor(0xFFFF6FA3)
            .setOngoing(true)
            .setContentIntent(pi);
        if (Build.VERSION.SDK_INT >= 31) b.setForegroundServiceBehavior(Notification.FOREGROUND_SERVICE_IMMEDIATE);
        return b.build();
    }

    @Override
    public void onLocationChanged(Location l) {
        if (l == null) return;
        synchronized (BUF) {
            if (BUF.size() < 40000) {
                BUF.add(new double[]{l.getLatitude(), l.getLongitude(),
                    l.hasAccuracy() ? l.getAccuracy() : 999, (double) l.getTime(),
                    l.hasSpeed() ? l.getSpeed() : -1});
            }
        }
        state = "ok";
    }

    @Override
    public void onProviderEnabled(String provider) { if (!"ok".equals(state)) state = "wait"; }

    @Override
    public void onProviderDisabled(String provider) { state = "disabled"; }

    @Override
    public void onStatusChanged(String provider, int status, Bundle extras) { }

    @Override
    public void onTaskRemoved(Intent rootIntent) {
        stopSelf();
        super.onTaskRemoved(rootIntent);
    }

    @Override
    public void onDestroy() {
        running = false;
        try { if (lm != null) lm.removeUpdates(this); } catch (Throwable ignored) { }
        try { if (wake != null && wake.isHeld()) wake.release(); } catch (Throwable ignored) { }
        if (!"denied".equals(state) && !"error".equals(state)) state = "off";
        super.onDestroy();
    }
}
