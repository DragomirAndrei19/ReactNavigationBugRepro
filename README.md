# ReactNavigationBugRepro

Minimal reproduction for a regression introduced in `react-native-screens@4.25.0` on Android.

## The bug

Pressing the back button from a stack screen that was pushed on top of a native bottom-tab navigator throws:

> **[RNScreens] ColorSchemeCoordinator's setup method must not be called again without calling teardown() first.**

The warning does not appear on `react-native-screens@4.24.0`.

## Likely cause

In [`gamma/tabs/container/TabsContainer.kt`](https://github.com/software-mansion/react-native-screens/blob/main/android/src/main/java/com/swmansion/rnscreens/gamma/tabs/container/TabsContainer.kt), `onAttachedToWindow()` calls `colorSchemeCoordinator.setup(...)`, but the matching `colorSchemeCoordinator.teardown()` is never called from `onDetachedFromWindow()`. When the `TabsContainer` re-attaches (e.g. after popping the pushed screen), `setup()` runs again while `isSetUp` is still `true` and the `check(!isSetUp)` guard in `ColorSchemeCoordinator.setup()` fails.

Suggested fix:

```kotlin
override fun onDetachedFromWindow() {
    super.onDetachedFromWindow()
    teardownFragmentManager()
    colorSchemeCoordinator.teardown()
}
```

## Structure

```
NavigationContainer
  RootStack (native-stack)
    Tabs (native bottom tabs — @react-navigation/bottom-tabs/unstable)
      HomeTab / ListTab / SettingsTab — each a nested native-stack
    Details (root-level native-stack screen with header back button)
```

## How to run

```bash
npm install
cd ios && bundle install && bundle exec pod install && cd ..

npm run android
# or
npm run ios
```

## Steps to reproduce

1. Launch the app on Android (lands on the `List` tab).
2. Tap any list item → pushes `Details` on the root stack.
3. Press the header back button (or system back).
4. Observe the warning in Logcat the moment the tabs re-attach.

## Versions

| package                        | version |
| ------------------------------ | ------- |
| @react-navigation/native       | 7.2.4   |
| @react-navigation/bottom-tabs  | 7.16.0  |
| @react-navigation/native-stack | 7.15.0  |
| react-native-screens           | 4.25.0  |
| react-native-safe-area-context | 5.7.0   |
| react-native-gesture-handler   | 2.31.2  |
| react-native                   | 0.85.3  |
| node                           | 24.15.0 |
| npm                            | 11.12.1 |
