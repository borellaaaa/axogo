package com.axogo.app;

import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;

/** Reagenda o lembrete de treino depois que o celular reinicia. */
public class BootReceiver extends BroadcastReceiver {
    @Override
    public void onReceive(Context c, Intent intent) {
        if (intent != null && Intent.ACTION_BOOT_COMPLETED.equals(intent.getAction())) {
            ReminderReceiver.schedule(c);
        }
    }
}
