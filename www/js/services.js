angular.module('app.services', [])

    .factory('appFactory', ['$q', 'Base64', '$http', '$localStorage','sqlLiteFactory','dataValuesFactory','$interval', function ($q, Base64, $http, $localStorage,sqlLiteFactory,dataValuesFactory,$interval) {
        var syncCtr;
        var appFactory = {
            getFormattedBaseUrl: function (url) {
                var defer = $q.defer();
                if (url != undefined) {
                    var baseUrl = appFactory.getFormatUrl(url);
                    defer.resolve(baseUrl);
                } else {
                    defer.reject()
                }
                return defer.promise;
            },
            getFormatUrl: function (url) {
                var urlToBeFormatted = '', newArray = [], formattedBaseUrl = null, baseUrlString = null;
                if (!(url.split('/')[0] == "https:" || url.split('/')[0] == "http:")) {
                    urlToBeFormatted = "http://" + url;
                } else {
                    urlToBeFormatted = url;
                }
                baseUrlString = urlToBeFormatted.split('/');
                for (var i = 0; i < baseUrlString.length; i++) {
                    if (baseUrlString[i]) {
                        newArray.push(baseUrlString[i]);
                    }
                }
                formattedBaseUrl = newArray[0] + '/';
                for (var j = 0; j < newArray.length; j++) {
                    if (j != 0) {
                        formattedBaseUrl = formattedBaseUrl + '/' + newArray[j];
                    }
                }
                return formattedBaseUrl;
            },
            getDataBaseName: function () {
                var defer = $q.defer();
                var databaseName = $localStorage.app.baseUrl;
                databaseName = databaseName.replace('://', '_').replace('/', '_').replace('.', '_').replace(':', '_');
                defer.resolve(databaseName + '.db');
                return defer.promise;
            },
            setAuthorizationOnHeader: function (user) {
                var defer = $q.defer();
                $http.defaults.headers.common.Authorization = 'Basic ' + Base64.encode(user.username + ':' + user.password);
                defer.resolve();
                return defer.promise;
            },
            getAllAppInformation : function(){
                var appInformation = $localStorage.app;
                var defer = $q.defer();
                defer.resolve(appInformation);
                return defer.promise;
            },
            startDataSynchronization :function(time){
                syncCtr = $interval(function () {
                    appFactory.getDataForSynchronization().then(function(){
                    },function(){
                    });
                },time);
            },
            stopDataSynchronization : function(){
                $interval.cancel(syncCtr);
            },
            getDataForSynchronization: function(){
                var resource = "dataValues";
                var defer = $q.defer();
                sqlLiteFactory.getDataFromTableByAttributes(resource, "syncStatus", ['not synced']).then(function (notSyncedDataValues) {
                    var formattedDataValues = appFactory.getFormattedDataValues(notSyncedDataValues);
                    dataValuesFactory.upDateDataValues(formattedDataValues,notSyncedDataValues);
                    defer.resolve();
                },function(){
                    defer.reject();
                });
                return defer.promise;
            },
            getFormattedDataValues : function(dataValues){
                var formattedDataValues = [];
                dataValues.forEach(function(dataValue){
                    var formParameter = "de="+dataValue.de+"&pe="+dataValue.pe+"&ou=";
                    formParameter += dataValue.ou+"&co="+dataValue.co+"&value="+dataValue.value;
                    if(dataValue.cp != "0"){
                        formParameter = formParameter +"&cc="+dataValue.cc+"&cp="+dataValue.cp;
                    }
                    formattedDataValues.push(formParameter);
                });
                return formattedDataValues;
            }

        };
        return appFactory;
    }])

    .factory('userFactory', ['$q', '$localStorage', '$http', function ($q, $localStorage, $http) {
        var emptyUser = {username: '', password: '', isLogin: false};
        var userFactory = {
            authenticateUser: function () {
                var defer = $q.defer();
                var fields = "fields=[:all],userCredentials[userRoles[name,dataSets[id,name],programs[id,name]]";
                $http.get($localStorage.app.baseUrl + '/api/25/me.json?' + fields).then(function (response) {
                    defer.resolve(response.data);
                }, function (error) {
                    defer.reject(error.status);
                });
                return defer.promise;
            },
            setCurrentUser: function (user, userData) {
                var defer = $q.defer();
                if (angular.isDefined(user.username) && angular.isDefined(user.password)) {
                    $localStorage.app.user = user;
                }
                if (angular.isDefined(userData)) {
                    $localStorage.app.userData = {
                        "Name": userData.name,
                        "Employer": userData.employer,
                        "Job Title": userData.jobTitle,
                        "Education": userData.education,
                        "Gender": userData.gender,
                        "Birthday": userData.birthday,
                        "Nationality": userData.nationality,
                        "Interests": userData.interests,
                        "userRoles": userData.userCredentials.userRoles,
                        "organisationUnits": userData.organisationUnits
                    };
                }
                defer.resolve();
                return defer.promise;

            },
            setEmptyUser: function () {
                var defer = $q.defer();
                if (!angular.isDefined($localStorage.app)) {
                    $localStorage.app.user = emptyUser;
                }
                defer.resolve(emptyUser);
                //defer.reject();
                return defer.promise;
            },
            getCurrentLoginUser: function () {
                var currentUser = $localStorage.app.user;
                var defer = $q.defer();
                defer.resolve(currentUser);
                return defer.promise;
            },
            getCurrentLoginUserUserdata: function () {
                var currentUserData = $localStorage.app.userData;
                var defer = $q.defer();
                defer.resolve(currentUserData);
                return defer.promise;
            }
        };

        return userFactory;

    }])
    .factory('Base64', function () {
        /* jshint ignore:start */

        var keyStr = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=';

        return {
            encode: function (input) {
                var output = "";
                var chr1, chr2, chr3 = "";
                var enc1, enc2, enc3, enc4 = "";
                var i = 0;

                do {
                    chr1 = input.charCodeAt(i++);
                    chr2 = input.charCodeAt(i++);
                    chr3 = input.charCodeAt(i++);

                    enc1 = chr1 >> 2;
                    enc2 = ((chr1 & 3) << 4) | (chr2 >> 4);
                    enc3 = ((chr2 & 15) << 2) | (chr3 >> 6);
                    enc4 = chr3 & 63;

                    if (isNaN(chr2)) {
                        enc3 = enc4 = 64;
                    } else if (isNaN(chr3)) {
                        enc4 = 64;
                    }

                    output = output +
                        keyStr.charAt(enc1) +
                        keyStr.charAt(enc2) +
                        keyStr.charAt(enc3) +
                        keyStr.charAt(enc4);
                    chr1 = chr2 = chr3 = "";
                    enc1 = enc2 = enc3 = enc4 = "";
                } while (i < input.length);

                return output;
            },

            decode: function (input) {
                var output = "";
                var chr1, chr2, chr3 = "";
                var enc1, enc2, enc3, enc4 = "";
                var i = 0;

                // remove all characters that are not A-Z, a-z, 0-9, +, /, or =
                var base64test = /[^A-Za-z0-9\+\/\=]/g;
                if (base64test.exec(input)) {
                    window.alert("There were invalid base64 characters in the input text.\n" +
                        "Valid base64 characters are A-Z, a-z, 0-9, '+', '/',and '='\n" +
                        "Expect errors in decoding.");
                }
                input = input.replace(/[^A-Za-z0-9\+\/\=]/g, "");

                do {
                    enc1 = keyStr.indexOf(input.charAt(i++));
                    enc2 = keyStr.indexOf(input.charAt(i++));
                    enc3 = keyStr.indexOf(input.charAt(i++));
                    enc4 = keyStr.indexOf(input.charAt(i++));

                    chr1 = (enc1 << 2) | (enc2 >> 4);
                    chr2 = ((enc2 & 15) << 4) | (enc3 >> 2);
                    chr3 = ((enc3 & 3) << 6) | enc4;

                    output = output + String.fromCharCode(chr1);

                    if (enc3 != 64) {
                        output = output + String.fromCharCode(chr2);
                    }
                    if (enc4 != 64) {
                        output = output + String.fromCharCode(chr3);
                    }

                    chr1 = chr2 = chr3 = "";
                    enc1 = enc2 = enc3 = enc4 = "";

                } while (i < input.length);

                return output;
            }
        };

        /* jshint ignore:end */
    })

    .factory('sqlLiteFactory', ['$q', '$cordovaSQLite', '$localStorage', function ($q, $cordovaSQLite, $localStorage) {
        var db = null;
        var databaseStructure = {
            organisationUnits: {
                fields: [
                    {value: 'id', type: 'TEXT'},
                    {value: 'name', type: 'TEXT'},
                    {value: 'ancestors', type: 'LONGTEXT'},
                    {value: 'dataSets', type: 'LONGTEXT'},
                    {value: 'level', type: 'TEXT'},
                    {value: 'children', type: 'LONGTEXT'}
                ]
            },
            dataSets: {
                fields: [
                    {value: 'id', type: 'TEXT'},
                    {value: 'name', type: 'TEXT'},
                    {value: 'timelyDays', type: 'TEXT'},
                    {value: 'formType', type: 'TEXT'},
                    {value: 'periodType', type: 'TEXT'},
                    {value: 'openFuturePeriods', type: 'TEXT'},
                    {value: 'expiryDays', type: 'TEXT'},
                    {value: 'dataElements', type: 'LONGTEXT'},
                    {value: 'organisationUnits', type: 'LONGTEXT'},
                    {value: 'sections', type: 'LONGTEXT'},
                    {value: 'indicators', type: 'LONGTEXT'},
                    {value: 'categoryCombo', type: 'LONGTEXT'}
                ]
            },
            sections: {
                fields: [
                    {value: 'id', type: 'TEXT'},
                    {value: 'name', type: 'TEXT'},
                    {value: 'indicators', type: 'LONGTEXT'},
                    {value: 'dataElements', type: 'LONGTEXT'}
                ]
            },
            indicators: {
                fields: [
                    {value: 'id', type: 'TEXT'},
                    {value: 'name', type: 'TEXT'},
                    {value: 'denominatorDescription', type: 'TEXT'},
                    {value: 'numeratorDescription', type: 'TEXT'},
                    {value: 'numerator', type: 'TEXT'},
                    {value: 'denominator', type: 'TEXT'},
                    {value: 'indicatorType', type: 'LONGTEXT'}
                ]
            },
            reports: {
                fields: [
                    {value: 'id', type: 'TEXT'},
                    {value: 'name', type: 'TEXT'},
                    {value: 'created', type: 'TEXT'},
                    {value: 'type', type: 'TEXT'},
                    {value: 'relativePeriods', type: 'LONGTEXT'},
                    {value: 'reportParams', type: 'LONGTEXT'},
                    {value: 'designContent', type: 'LONGTEXT'}
                ]
            },
            constants: {
                fields: [
                    {value: 'id', type: 'TEXT'},
                    {value: 'value', type: 'TEXT'}
                ]
            },
            dataValues : {
                fields: [
                    {value: 'id', type: 'TEXT'},
                    {value: 'de', type: 'TEXT'},
                    {value: 'co', type: 'TEXT'},
                    {value: 'pe', type: 'TEXT'},
                    {value: 'ou', type: 'TEXT'},
                    {value: 'cc', type: 'TEXT'},
                    {value: 'cp', type: 'TEXT'},
                    {value: 'value', type: 'TEXT'},
                    {value: 'syncStatus', type: 'TEXT'},
                    {value: 'dataSetId', type: 'TEXT'}
                ]
            },
            programs: {
                fields: [
                    {value: 'id', type: 'TEXT'},
                    {value: 'name', type: 'TEXT'},
                    {value: 'version', type: 'TEXT'},
                    {value: 'programType', type: 'TEXT'},
                    {value: 'programTrackedEntityAttributes', type: 'LONGTEXT'},
                    {value: 'organisationUnits', type: 'LONGTEXT'},
                    {value: 'programStages', type: 'LONGTEXT'}
                ]
            }
        };

        var sqlLiteFactory = {
            getDataBaseStructure: function () {
                return databaseStructure;
            },
            openDatabase: function (databaseName) {
                var defer = $q.defer();
                if (window.cordova) {
                    //device
                    db = $cordovaSQLite.openDB({name: databaseName, location: 'default'});
                } else {
                    // browser
                    var databaseNameArray = databaseName.split('.');
                    db = window.openDatabase(databaseName, '1', databaseNameArray[0], 1024 * 1024 * 10000);
                }
                defer.resolve();
                return defer.promise;
            },
            createTable: function (tableName, fields) {
                var defer = $q.defer();
                var db = null, query = 'CREATE TABLE IF NOT EXISTS ' + tableName + ' (', databaseName = $localStorage.app.baseBaseName;
                fields.forEach(function (field, index) {
                    if (field.value == "id") {
                        query += field.value + " " + field.type + ' primary key';
                    } else {
                        query += field.value + " " + field.type;
                    }
                    if ((index + 1) < fields.length) {
                        query += ','
                    }
                });
                query += ')';
                if (window.cordova) {
                    //for mobile devices
                    db = $cordovaSQLite.openDB({name: databaseName, location: 'default'});
                    $cordovaSQLite.execute(db, query, []).then(function (res) {
                        defer.resolve();
                    }, function () {
                        defer.reject();
                    });
                }
                else {
                    //for browser
                    var databaseNameArray = databaseName.split('.');
                    db = window.openDatabase(databaseName, '1', databaseNameArray[0], 1024 * 1024 * 10000);
                    db.transaction(function (tx) {
                        tx.executeSql(query, [], function (tx, result) {
                            defer.resolve();
                        }, function (error) {
                            defer.reject();
                        });
                    });
                }
                defer.resolve();
                return defer.promise;
            },
            insertDataOnTable: function (tableName, fieldsValues) {
                var dataBaseStructure = sqlLiteFactory.getDataBaseStructure();
                var fields = dataBaseStructure[tableName].fields;
                var dataColumns = "", questionMarks = "", values = [], defer = $q.defer(), databaseName = $localStorage.app.baseBaseName;
                fields.forEach(function (field, index) {
                    var dataColumn = field.value;
                    if (fieldsValues[dataColumn]) {
                        var dataColumnValue = fieldsValues[dataColumn];
                    }
                    dataColumns += dataColumn;
                    questionMarks += "?";
                    if ((index + 1) < fields.length) {
                        dataColumns += ',';
                        questionMarks += ',';
                    }
                    if (field.type != "LONGTEXT") {
                        if (dataColumnValue == undefined) {
                            dataColumnValue = 0;
                        }
                        values.push(dataColumnValue);
                    } else {
                        values.push(JSON.stringify(dataColumnValue));
                    }
                });
                dataBaseStructure = null;fields = null;
                var query = "INSERT OR REPLACE INTO " + tableName + " (" + dataColumns + ") VALUES (" + questionMarks + ")";
                if (window.cordova) {
                    //for mobile devices
                    db = $cordovaSQLite.openDB({name: databaseName, location: 'default'});
                    $cordovaSQLite.execute(db, query, values).then(function (res) {
                        defer.resolve();
                    }, function () {
                        defer.reject();
                    });
                }
                else {
                    //for browser
                    var databaseNameArray = databaseName.split('.');
                    db = window.openDatabase(databaseName, '1', databaseNameArray[0], 1024 * 1024 * 10000);
                    db.transaction(function (tx) {
                        tx.executeSql(query, values, function (tx, result) {
                            defer.resolve();
                        }, function (error) {
                            defer.reject();
                        });
                    });
                }
                return defer.promise;
            },
            getDataFromTableByAttributes: function (tableName, attribute, attributesValuesArray) {
                var dataBaseStructure = sqlLiteFactory.getDataBaseStructure();
                var fields = dataBaseStructure[tableName].fields;
                var db = null, values = [], defer = $q.defer(), databaseName = $localStorage.app.baseBaseName, query = "";
                query += "SELECT * FROM " + tableName + " WHERE " + attribute + " IN (";
                var inClauseValues = "";
                attributesValuesArray.forEach(function (attributesValue, index) {
                    inClauseValues += "'" + attributesValue + "'";
                    if ((index + 1) < attributesValuesArray.length) {
                        inClauseValues += ',';
                    }
                });
                query += inClauseValues;
                query += ")";

                if (window.cordova) {
                    //for mobile devices
                    db = $cordovaSQLite.openDB({name: databaseName, location: 'default'});
                    $cordovaSQLite.execute(db, query, values).then(function (result) {
                        defer.resolve(sqlLiteFactory.formatQueryReturnResult(result, fields));
                    }, function () {
                        defer.reject();
                    });
                }
                else {
                    //for browser
                    var databaseNameArray = databaseName.split('.');
                    db = window.openDatabase(databaseName, '1', databaseNameArray[0], 1024 * 1024 * 10000);
                    db.transaction(function (tx) {
                        tx.executeSql(query, values, function (tx, result) {
                            defer.resolve(sqlLiteFactory.formatQueryReturnResult(result, fields));
                        }, function (error) {
                            defer.reject();
                        });
                    });
                }
                return defer.promise;
            },
            getAllDataFromTable: function (tableName) {
                var dataBaseStructure = sqlLiteFactory.getDataBaseStructure();
                var fields = dataBaseStructure[tableName].fields;
                var db = null, values = [], defer = $q.defer(), databaseName = $localStorage.app.baseBaseName, query = "";
                query += "SELECT * FROM " + tableName + ";";

                if (window.cordova) {
                    //for mobile devices
                    db = $cordovaSQLite.openDB({name: databaseName, location: 'default'});
                    $cordovaSQLite.execute(db, query, values).then(function (result) {
                        defer.resolve(sqlLiteFactory.formatQueryReturnResult(result, fields));
                    }, function () {
                        defer.reject();
                    });
                }
                else {
                    //for browser
                    var databaseNameArray = databaseName.split('.');
                    db = window.openDatabase(databaseName, '1', databaseNameArray[0], 1024 * 1024 * 10000);
                    db.transaction(function (tx) {
                        tx.executeSql(query, values, function (tx, result) {
                            defer.resolve(sqlLiteFactory.formatQueryReturnResult(result, fields));
                        }, function (error) {
                            defer.reject();
                        });
                    });
                }
                return defer.promise;
            },
            formatQueryReturnResult: function (result, fields) {
                var len = result.rows.length;
                var data = [];

                for (var i = 0; i < len; i++) {
                    var row = {};
                    var currentRow = result.rows.item(i);
                    fields.forEach(function (field) {
                        var dataColumn = field.value;
                        if (field.type != "LONGTEXT") {
                            row[dataColumn] = currentRow[dataColumn]
                        } else {
                            row[dataColumn] = eval("(" + currentRow[dataColumn] + ")");
                        }
                    });
                    data.push(row);
                }
                return data;
            }

        };
        return sqlLiteFactory;

    }])

    .factory('systemFactory', ['$q', '$http', '$localStorage', function ($q, $http, $localStorage) {
        var systemFactory = {
            getDhis2InstanceSystemInfo: function () {
                var defer = $q.defer();
                $http.get($localStorage.app.baseUrl + '/api/25/system/info').then(function (response) {
                    defer.resolve(response.data);
                }, function (error) {
                    console.log('error', error);
                    defer.reject(error.status);
                });
                return defer.promise;
            },
            downloadMetadata: function (resource, resourceId, fields, filter) {
                var defer = $q.defer();
                var url = $localStorage.app.baseUrl + '/api/25/' + resource;
                if (resourceId || resourceId != null) {
                    url += "/" + resourceId + ".json?paging=false";
                } else {
                    url += ".json?paging=false";
                }
                if (fields || fields != null) {
                    url += '&fields=' + fields;
                }
                if (filter || filter != null) {
                    url += '&filter' + filter;
                }
                $http.get(url).then(function (response) {
                    defer.resolve(response.data);
                }, function (error) {
                    defer.reject(error.status);
                });
                return defer.promise;
            },
            getTrackedEntityInstances: function(ouId, programId) {
                var defer = $q.defer();
                var url = $localStorage.app.baseUrl + '/api/25/trackedEntityInstances/query.json?ou=' + ouId + '&program=' + programId;
                $http.get(url).then(function (response) {
                    defer.resolve(response.data);
                }, function (error) {
                    defer.reject(error.status);
                });
                return defer.promise;
            },
            getDataSetCompletenessInfo : function(dataSet,period,orgUnit,cc,cp){
                var defer = $q.defer();
                var parameter = 'dataSetId='+dataSet+'&periodId='+period+'&organisationUnitId='+orgUnit;
                if(cc != ""){
                    parameter += "&cc="+cc+"&cp="+cp
                }
                $http.get($localStorage.app.baseUrl + '/dhis-web-dataentry/getDataValues.action?'+parameter)
                    .success(function(results){
                        defer.resolve(results);
                    })
                    .error(function(){
                        defer.reject();
                    });
                return defer.promise;
            },
            completeOnDataSetRegistrations:function(parameter){
                var defer = $q.defer();
                $http.post($localStorage.app.baseUrl+'/api/25/completeDataSetRegistrations?'+parameter,null)
                    .then(function(){
                        //success
                        defer.resolve();
                    },function(){
                        //error
                        defer.reject();
                    });
                return defer.promise;
            },
            unDoCompleteOnDataSetRegistrations:function(parameter){
                var defer = $q.defer();
                $http.delete($localStorage.app.baseUrl+'/api/25/completeDataSetRegistrations?'+parameter,null)
                    .then(function(){
                        //success
                        defer.resolve();
                    },function(){
                        //error
                        defer.reject();
                    });
                return defer.promise;
            }
        };
        return systemFactory;
    }])

    .factory('dataValuesFactory', ['$q', '$http', '$localStorage','sqlLiteFactory', function ($q, $http, $localStorage,sqlLiteFactory) {
        var baseUrl = $localStorage.app.baseUrl;
        var dataValuesFactory = {
            getDataValueSet:function(dataSet,period,orgUnit,attributeOptionCombo){
                var defer = $q.defer();
                var parameter = 'dataSet='+dataSet+'&period='+period+'&orgUnit='+orgUnit;
                $http.get(baseUrl + '/api/25/dataValueSets.json?'+parameter)
                    .success(function(results){
                        dataValuesFactory.getFilteredDataValuesByDataSetAttributeOptionCombo(results.dataValues,attributeOptionCombo).then(function(FilteredDataValues){
                            defer.resolve(FilteredDataValues);
                        });
                    })
                    .error(function(error){
                        defer.reject();
                    });
                return defer.promise;
            },
            getFilteredDataValuesByDataSetAttributeOptionCombo : function(dataValues,attributeOptionCombo){
                var FilteredDataValues = [];
                var defer = $q.defer();
                if(dataValues){
                    dataValues.forEach(function(dataValue){
                        if(dataValue.attributeOptionCombo == attributeOptionCombo){
                            FilteredDataValues.push({
                                categoryOptionCombo : dataValue.categoryOptionCombo,
                                dataElement : dataValue.dataElement,
                                value : dataValue.value
                            });
                        }
                    });
                }

                defer.resolve(FilteredDataValues);
                return defer.promise;
            },
            getDataValuesSetAttributeOptionCombo : function(cc,cp,categoryOptionCombos){
                var attributeOptionCombo = "";
                var defer = $q.defer();
                if(cc == ""){
                    attributeOptionCombo = categoryOptionCombos[0].id;
                }else{
                    var categoriesOptionsArray = cp.split(';'),categoriesOptionsObjectsArray=[];
                    categoriesOptionsArray.forEach(function(categoriesOption){
                        categoriesOptionsObjectsArray.push({
                            "id": categoriesOption
                        });
                    });
                    for(var i = 0; i < categoryOptionCombos.length; i ++){
                        var hasAttributeOptionCombo = true,categoryOptionCombo = categoryOptionCombos[i];
                        categoriesOptionsObjectsArray.forEach(function(categoriesOptionsObject){
                            categoryOptionCombo.categoryOptions.forEach(function(categoryOption){
                                if(categoryOption.id != categoriesOptionsObject.id){
                                    hasAttributeOptionCombo = false;
                                }
                            });
                        });
                        if(hasAttributeOptionCombo){
                            attributeOptionCombo = categoryOptionCombo.id;
                            break;
                        }
                    }
                    categoriesOptionsArray = null;
                }
                defer.resolve(attributeOptionCombo);
                return defer.promise;
            },
            upDateDataValues : function(formattedDataValues,dataValues){
                if(dataValues.length > 0){
                    var resource = "dataValues";
                    formattedDataValues.forEach(function(formattedDataValue,index){
                        $http.post(baseUrl+'/api/25/dataValues?'+formattedDataValue,null).then(function(){
                            dataValues[index].syncStatus = "synced";
                            sqlLiteFactory.insertDataOnTable(resource,dataValues[index]).then(function(){
                            },function(){
                            });
                        },function(){
                        });
                    });
                }
            }
        };

        return dataValuesFactory;

    }])
    .factory('organisationUnitFactory', ['$q', '$filter', function ($q, $filter) {

        var organisationUnitFactory = {
            getSortedOrganisationUnits: function (organisationUnits) {
                var data = [], defer = $q.defer();
                organisationUnits.forEach(function (organisationUnit) {
                    data.push(organisationUnitFactory.sortingOrganisationUnit(organisationUnit));
                });
                defer.resolve(data);
                return defer.promise;
            },
            sortingOrganisationUnit: function (organisationUnit) {
                if (organisationUnit.children) {
                    organisationUnit.children = $filter('orderBy')(organisationUnit.children, 'name');
                    organisationUnit.children.forEach(function (child, index) {
                        organisationUnit.children[index] = organisationUnitFactory.sortingOrganisationUnit(child);
                    });
                }
                return organisationUnit;
            }

        };

        return organisationUnitFactory;

    }])

    .service('BlankService', [function () {

    }]);
