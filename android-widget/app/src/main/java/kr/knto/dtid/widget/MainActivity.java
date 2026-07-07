package kr.knto.dtid.widget;

import android.app.Activity;
import android.graphics.Bitmap;
import android.os.Bundle;
import android.view.WindowManager;
import android.widget.ImageView;
import android.widget.TextView;

public class MainActivity extends Activity {

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setContentView(R.layout.activity_main);

        findViewById(R.id.btnRefresh).setOnClickListener(v -> {
            renderQr();
            QrWidgetProvider.updateAll(this);
        });
    }

    @Override
    protected void onResume() {
        super.onResume();
        // 가맹점 제시용 화면이므로 밝기를 최대로 올린다
        WindowManager.LayoutParams lp = getWindow().getAttributes();
        lp.screenBrightness = 1f;
        getWindow().setAttributes(lp);

        renderQr();
    }

    private void renderQr() {
        Bitmap qr = QrUtil.makeQr(QrUtil.buildPayload(this), 800);
        ((ImageView) findViewById(R.id.mainQr)).setImageBitmap(qr);
        ((TextView) findViewById(R.id.mainName)).setText(QrUtil.getName(this) + "님");
        ((TextView) findViewById(R.id.mainMemberNo)).setText("NO. " + QrUtil.getMemberNo(this));
    }
}
