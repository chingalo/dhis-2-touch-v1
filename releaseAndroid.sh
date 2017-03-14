cordova build --release android
cd platforms/android/build/outputs/apk/
jarsigner -verbose -sigalg SHA1withRSA -digestalg SHA1 -keystore myAppKey.keystore android-release-unsigned.apk myAppKey
rm dhis-2-touch.apk
zipalign -v 4 android-release-unsigned.apk dhis-2-touch.apk
