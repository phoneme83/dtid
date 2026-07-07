package kr.knto.dtid.widget;

import android.app.PendingIntent;
import android.appwidget.AppWidgetManager;
import android.appwidget.AppWidgetProvider;
import android.content.ComponentName;
import android.content.Context;
import android.content.Intent;
import android.graphics.Bitmap;
import android.widget.RemoteViews;

import java.text.SimpleDateFormat;
import java.util.Date;
import java.util.Locale;

public class QrWidgetProvider extends AppWidgetProvider {

    public static final String ACTION_REFRESH = "kr.knto.dtid.widget.REFRESH";

    @Override
    public void onUpdate(Context context, AppWidgetManager manager, int[] widgetIds) {
        for (int id : widgetIds) {
            updateWidget(context, manager, id);
        }
    }

    @Override
    public void onReceive(Context context, Intent intent) {
        super.onReceive(context, intent);
        if (ACTION_REFRESH.equals(intent.getAction())) {
            updateAll(context);
        }
    }

    public static void updateAll(Context context) {
        AppWidgetManager manager = AppWidgetManager.getInstance(context);
        int[] ids = manager.getAppWidgetIds(new ComponentName(context, QrWidgetProvider.class));
        for (int id : ids) {
            updateWidget(context, manager, id);
        }
    }

    static void updateWidget(Context context, AppWidgetManager manager, int widgetId) {
        RemoteViews views = new RemoteViews(context.getPackageName(), R.layout.widget_qr);

        Bitmap qr = QrUtil.makeQr(QrUtil.buildPayload(context), 512);
        if (qr != null) {
            views.setImageViewBitmap(R.id.widgetQr, qr);
        }
        views.setTextViewText(R.id.widgetName, QrUtil.getName(context) + "님");
        String time = new SimpleDateFormat("HH:mm", Locale.KOREA).format(new Date());
        views.setTextViewText(R.id.widgetTime, time + " 갱신 ↻");

        PendingIntent openApp = PendingIntent.getActivity(
                context, 0,
                new Intent(context, MainActivity.class),
                PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);
        views.setOnClickPendingIntent(R.id.widgetRoot, openApp);

        Intent refreshIntent = new Intent(context, QrWidgetProvider.class).setAction(ACTION_REFRESH);
        PendingIntent refresh = PendingIntent.getBroadcast(
                context, 1, refreshIntent,
                PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);
        views.setOnClickPendingIntent(R.id.widgetTime, refresh);

        manager.updateAppWidget(widgetId, views);
    }
}
