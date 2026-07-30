package kr.knto.dtid.siteapp;

import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.content.Context;
import android.content.Intent;
import android.os.Build;

import org.json.JSONArray;
import org.json.JSONObject;

import java.util.ArrayList;
import java.util.List;

/**
 * 관리자가 발송한 알림(푸시)을 서버의 notices.json 에서 읽어 단말 알림으로 띄운다.
 *
 * 시안 검증 단계에서는 Firebase 프로젝트 없이도 동작해야 하므로, 서버가 밀어주는 방식(FCM)
 * 대신 앱이 확인하는 방식으로 구현했다. 관리자 화면의 발송 UI·대상(시안)·이력 구조는
 * FCM 전환 시 그대로 재사용할 수 있도록 맞춰 두었다.
 */
public final class Notices {

    static final String CHANNEL_ID = "dtid_notice";
    private static final String CHANNEL_NAME = "디지털 관광주민증 알림";

    private Notices() {
    }

    static void ensureChannel(Context c) {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            NotificationManager nm = c.getSystemService(NotificationManager.class);
            if (nm.getNotificationChannel(CHANNEL_ID) == null) {
                nm.createNotificationChannel(new NotificationChannel(
                        CHANNEL_ID, CHANNEL_NAME, NotificationManager.IMPORTANCE_DEFAULT));
            }
        }
    }

    /** 하나의 발송 건. */
    static final class Item {
        String id = "";
        String ts = "";
        String title = "";
        String body = "";
        String link = "";
    }

    /**
     * notices.json 을 읽어 이 시안(BuildConfig.SITE_CODE)이 대상인 미수신 건만 골라낸다.
     * 대상 표기는 "all" 또는 시안 코드 배열(["a","c"])을 모두 허용한다.
     */
    static List<Item> fetchNew(Context c) {
        List<Item> out = new ArrayList<>();
        String json = Http.get(Prefs.baseUrl(c) + "notices.json", 5000);
        if (json == null) {
            return out;
        }
        String since = Prefs.lastNoticeTs(c);
        String newest = since;
        try {
            JSONObject root = new JSONObject(json);
            JSONArray arr = root.optJSONArray("notices");
            if (arr == null) {
                return out;
            }
            for (int i = 0; i < arr.length(); i++) {
                JSONObject o = arr.getJSONObject(i);
                if (!targets(o, BuildConfig.SITE_CODE)) {
                    continue;
                }
                String ts = o.optString("sendAt", o.optString("ts", ""));
                // 이미 처리한 시점보다 뒤에 발송된 건만 알린다.
                if (ts.isEmpty() || ts.compareTo(since) <= 0) {
                    continue;
                }
                Item it = new Item();
                it.id = o.optString("id", String.valueOf(i));
                it.ts = ts;
                it.title = o.optString("title", "안내");
                it.body = o.optString("body", "");
                it.link = o.optString("link", "");
                out.add(it);
                if (ts.compareTo(newest) > 0) {
                    newest = ts;
                }
            }
            if (!newest.equals(since)) {
                Prefs.setLastNoticeTs(c, newest);
            }
        } catch (Exception ignored) {
            // 형식이 깨져도 앱 동작에는 영향을 주지 않는다.
        }
        return out;
    }

    private static boolean targets(JSONObject o, String siteCode) {
        Object t = o.opt("target");
        if (t == null) {
            return true;
        }
        if (t instanceof String) {
            String s = (String) t;
            return "all".equalsIgnoreCase(s) || s.equalsIgnoreCase(siteCode);
        }
        if (t instanceof JSONArray) {
            JSONArray a = (JSONArray) t;
            for (int i = 0; i < a.length(); i++) {
                String s = a.optString(i, "");
                if ("all".equalsIgnoreCase(s) || s.equalsIgnoreCase(siteCode)) {
                    return true;
                }
            }
        }
        return false;
    }

    static void show(Context c, Item it) {
        ensureChannel(c);

        Intent i = new Intent(c, MainActivity.class);
        if (!it.link.isEmpty()) {
            i.putExtra(MainActivity.EXTRA_OPEN_PATH, it.link);
        }
        i.setFlags(Intent.FLAG_ACTIVITY_CLEAR_TOP | Intent.FLAG_ACTIVITY_SINGLE_TOP);

        int flags = PendingIntent.FLAG_UPDATE_CURRENT;
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
            flags |= PendingIntent.FLAG_IMMUTABLE;
        }
        PendingIntent pi = PendingIntent.getActivity(c, it.id.hashCode(), i, flags);

        Notification.Builder b;
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            b = new Notification.Builder(c, CHANNEL_ID);
        } else {
            b = new Notification.Builder(c);
        }
        b.setSmallIcon(android.R.drawable.ic_dialog_info)
                .setContentTitle(it.title)
                .setContentText(it.body)
                .setStyle(new Notification.BigTextStyle().bigText(it.body))
                .setContentIntent(pi)
                .setAutoCancel(true);

        NotificationManager nm = (NotificationManager) c.getSystemService(Context.NOTIFICATION_SERVICE);
        nm.notify(Math.abs(it.id.hashCode()), b.build());
    }
}
