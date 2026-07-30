package kr.knto.dtid.siteapp;

import android.app.job.JobInfo;
import android.app.job.JobParameters;
import android.app.job.JobScheduler;
import android.app.job.JobService;
import android.content.ComponentName;
import android.content.Context;

import java.util.List;

/** 앱이 떠 있지 않을 때도 주기적으로 관리자 발송 건을 확인해 알림을 띄운다. */
public class NoticeJobService extends JobService {

    private static final int JOB_ID = 4301;
    /** 최소 주기는 OS가 15분으로 제한한다. */
    private static final long INTERVAL_MS = 15 * 60 * 1000L;

    static void schedule(Context c) {
        JobScheduler js = (JobScheduler) c.getSystemService(Context.JOB_SCHEDULER_SERVICE);
        if (js == null) {
            return;
        }
        JobInfo job = new JobInfo.Builder(JOB_ID, new ComponentName(c, NoticeJobService.class))
                .setRequiredNetworkType(JobInfo.NETWORK_TYPE_ANY)
                .setPeriodic(INTERVAL_MS)
                .setPersisted(true)
                .build();
        js.schedule(job);
    }

    @Override
    public boolean onStartJob(JobParameters params) {
        new Thread(() -> {
            List<Notices.Item> items = Notices.fetchNew(getApplicationContext());
            for (Notices.Item it : items) {
                Notices.show(getApplicationContext(), it);
            }
            jobFinished(params, false);
        }).start();
        return true;
    }

    @Override
    public boolean onStopJob(JobParameters params) {
        return true;
    }
}
