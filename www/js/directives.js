angular.module('app.directives', [])

    .directive('tooltip', function () {
        return {
            restrict: 'C',
            link: function (scope, element, attrs) {
                if (attrs.title) {
                    var $element = $(element);
                    $element.attr("title", attrs.title);
                    $element.tooltipster({
                        animation: attrs.animation,
                        trigger: "click",
                        position: "top",
                        positionTracker: true,
                        maxWidth: 500,
                        contentAsHTML: true
                    });
                }
            }
        };
    })
    .directive('blankDirective', [function(){

    }]);

