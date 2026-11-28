package app.pao.songbook;

import android.graphics.Color;
import android.os.Build;
import android.view.Window;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

/**
 * Paints the area behind the phone's status bar and navigation bar in the app's own background colour, so the
 * bars always match the app (and the dark or light icons chosen for them always contrast), whatever the phone's
 * own light or dark setting is. The web app calls this whenever its palette or Day/Night look changes.
 */
@CapacitorPlugin(name = "BarColor")
public class BarColorPlugin extends Plugin {

    @PluginMethod
    public void set(PluginCall call) {
        String hex = call.getString("color");
        if (hex == null) {
            call.reject("color is required");
            return;
        }
        final int color;
        try {
            color = Color.parseColor(hex);
        } catch (IllegalArgumentException e) {
            call.reject("not a colour: " + hex);
            return;
        }
        getActivity().runOnUiThread(() -> {
            Window window = getActivity().getWindow();
            window.getDecorView().setBackgroundColor(color);
            window.setStatusBarColor(color);
            window.setNavigationBarColor(color);
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
                // stop the phone from adding its own grey scrim behind the bars
                window.setStatusBarContrastEnforced(false);
                window.setNavigationBarContrastEnforced(false);
            }
            call.resolve();
        });
    }
}
