
function aa() {
    var ret = 'aa';
    console.log(ret);
}

angular.controller('testCtrl', function ($rootScope, $compiler) {
    console.log('controller');
})
