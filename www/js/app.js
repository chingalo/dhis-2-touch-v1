// Ionic Starter App

// angular.module is a global place for creating, registering and retrieving Angular modules
// 'starter' is the name of this angular module example (also set in a <body> attribute in index.html)
// the 2nd parameter is an array of 'requires'
// 'starter.services' is found in services.js
// 'starter.controllers' is found in controllers.js
angular.module('app', ['ionic',
        'ngCordova',
        'ngStorage',
        'app.controllers',
        'ui-notification',
        'app.routes',
        'app.services',
        'ui.date',
        'angular-spinkit',
        'app.directives'])

    .run(function ($ionicPlatform, $cordovaSplashscreen) {
        $ionicPlatform.ready(function () {
            var db = null;
            if (window.cordova && window.cordova.plugins && window.cordova.plugins.Keyboard) {
                cordova.plugins.Keyboard.hideKeyboardAccessoryBar(true);
                cordova.plugins.Keyboard.disableScroll(true);
            }
            if (window.StatusBar) {
                StatusBar.styleDefault();
            }
            $cordovaSplashscreen.hide();
        });
    })
    .config(function(NotificationProvider) {
        NotificationProvider.setOptions({
            delay: 3500,
            startTop: 20,
            startRight: 10,
            positionX: 'center',
            positionY: 'bottom'
        });
    })
    .filter('paginationFilter', function () {
        return function (input, start) {
            start = +start; //parse to int
            return input.slice(start);
        }
    })
    .filter('to_trusted_html', ['$sce', function ($sce) {
        return function (text) {
            return $sce.trustAsHtml(text);
        };
    }]);