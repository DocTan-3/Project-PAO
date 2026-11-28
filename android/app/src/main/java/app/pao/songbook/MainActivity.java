package app.pao.songbook;

import android.os.Bundle;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {

    @Override
    public void onCreate(Bundle savedInstanceState) {
        registerPlugin(BarColorPlugin.class);
        super.onCreate(savedInstanceState);
    }
}
