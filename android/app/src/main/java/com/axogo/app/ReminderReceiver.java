package com.axogo.app;

import android.app.AlarmManager;
import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.os.Build;
import android.util.Log;

import java.util.Calendar;
import java.util.Locale;

/** Lembrete diário de treino (notificação no horário escolhido no app). */
public class ReminderReceiver extends BroadcastReceiver {
    static final String CHANNEL = "axogo_remind";

    static PendingIntent pending(Context c) {
        Intent i = new Intent(c, ReminderReceiver.class);
        return PendingIntent.getBroadcast(c, 21, i, PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);
    }

    /** (Re)agenda o lembrete conforme o que está salvo nas preferências. */
    static void schedule(Context c) {
        try {
            SharedPreferences p = c.getSharedPreferences("axogo", Context.MODE_PRIVATE);
            AlarmManager am = (AlarmManager) c.getSystemService(Context.ALARM_SERVICE);
            if (am == null) return;
            PendingIntent pi = pending(c);
            am.cancel(pi);
            if (!p.getBoolean("remOn", false)) return;
            Calendar cal = Calendar.getInstance();
            cal.set(Calendar.HOUR_OF_DAY, p.getInt("remH", 18));
            cal.set(Calendar.MINUTE, p.getInt("remM", 0));
            cal.set(Calendar.SECOND, 0);
            cal.set(Calendar.MILLISECOND, 0);
            if (cal.getTimeInMillis() <= System.currentTimeMillis() + 5000) cal.add(Calendar.DAY_OF_YEAR, 1);
            am.setInexactRepeating(AlarmManager.RTC_WAKEUP, cal.getTimeInMillis(), AlarmManager.INTERVAL_DAY, pi);
        } catch (Throwable t) {
            Log.w(MainActivity.TAG, "agendar lembrete", t);
        }
    }

    @Override
    public void onReceive(Context c, Intent intent) {
        try {
            SharedPreferences p = c.getSharedPreferences("axogo", Context.MODE_PRIVATE);
            if (!p.getBoolean("remOn", false)) return;
            Calendar now = Calendar.getInstance();
            String today = String.format(Locale.US, "%04d-%02d-%02d",
                now.get(Calendar.YEAR), now.get(Calendar.MONTH) + 1, now.get(Calendar.DAY_OF_MONTH));
            if (today.equals(p.getString("trained", ""))) return;           // já treinou hoje
            String days = p.getString("remDays", "");
            int dow = now.get(Calendar.DAY_OF_WEEK) - 1;                      // 0 = domingo
            if (days.length() > 0 && !("," + days + ",").contains("," + dow + ",")) return; // dia de descanso

            NotificationManager nm = (NotificationManager) c.getSystemService(Context.NOTIFICATION_SERVICE);
            if (nm == null) return;
            Notification.Builder b;
            if (Build.VERSION.SDK_INT >= 26) {
                nm.createNotificationChannel(new NotificationChannel(CHANNEL,
                    c.getString(R.string.ch_remind), NotificationManager.IMPORTANCE_DEFAULT));
                b = new Notification.Builder(c, CHANNEL);
            } else {
                b = new Notification.Builder(c);
            }
            Intent open = new Intent(c, MainActivity.class).addFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_SINGLE_TOP);
            PendingIntent pi = PendingIntent.getActivity(c, 22, open,
                PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);
            String text = p.getString("remText", "");
            b.setSmallIcon(R.drawable.ic_stat_axo)
                .setContentTitle(p.getString("remTitle", "AxoGo"))
                .setContentText(text)
                .setStyle(new Notification.BigTextStyle().bigText(text))
                .setColor(0xFFFF6FA3)
                .setAutoCancel(true)
                .setContentIntent(pi);
            nm.notify(22, b.build());
        } catch (Throwable t) {
            Log.w(MainActivity.TAG, "lembrete", t);
        }
    }
}
