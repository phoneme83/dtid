package kr.knto.dtid.siteapp;

import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;

/** 재부팅 후 알림 확인 주기를 다시 등록한다. */
public class BootReceiver extends BroadcastReceiver {
    @Override
    public void onReceive(Context context, Intent intent) {
        NoticeJobService.schedule(context);
    }
}
