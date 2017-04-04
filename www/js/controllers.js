angular.module('app.controllers', [])

  .controller('mainCtrl', function ($scope, userFactory, $timeout,
                                    Notification, $ionicLoading,sqlLiteFactory,
                                    $localStorage, $ionicHistory
    , $state) {

    //object for controller
    $scope.data = {
      username: ""
    };

    //checking if local storage has been initiate
    if (angular.isUndefined($localStorage.app)) {
      $localStorage.app = {
        user: {},
        userData: {},
        systemInformation: {},
        dataEntryForm: {},
        report:{
          selectedReport : {},
          reportMetadata : {}
        },
        allOrgUnitData: {},
        settings :{
          currentSelected : "",
          synchronization:{
            timeType : 'minutes',
            timeValue : 1000 * 60 * 2
          },
          entryForm : {},
          dataReset : {}
        }
      }
    }

    /***
     * create user object
     */
    userFactory.setEmptyUser().then(function () {
    });

    /**
     * onClickLogOutButton
     */
    $scope.onClickLogOutButton = function () {
      //reset user properties
      $localStorage.app.user.isLogin = !$localStorage.app.user.isLogin;
      delete $localStorage.app.userData;

      $state.go('login', {}, {});
      $timeout(function () {
        $ionicHistory.clearCache();
        $ionicHistory.clearHistory();
        Notification('You have successfully log out');
      }, 300);
    };

    /**
     * before a view has not been rendered
     */
    $scope.$on("$ionicView.beforeLeave", function (event, data) {
      // handle before view has been leave
      $ionicLoading.show({
        template: 'Please waiting'
      });
    });

    /**
     * after view has been render
     */
    $scope.$on("$ionicView.afterEnter", function (event, data) {
      //handling after view has been entered
      $ionicLoading.hide();
      if (angular.isDefined($localStorage.app.userData)) {
        if ($localStorage.app.userData.Name) {
          var nameArray = $localStorage.app.userData.Name.split(' ');
          if (nameArray[0]) {
            $scope.data.username = nameArray[0];
          }
        }
      }
    });

    //flexibility for form
    $scope.isInteger = function (key) {
      if (key == "NUMBER" || key == "INTEGER") {
        return true;
      } else {
        return false;
      }
    };
    $scope.isTrueOnly = function (key) {
      if (key == "TRUE_ONLY") {
        return true;
      } else {
        return false;
      }
    };
    $scope.isIntegerZeroOrPositive = function (key) {
      if (key == "INTEGER_ZERO_OR_POSITIVE") {
        return true;
      } else {
        return false;
      }
    };
    $scope.isDate = function (key) {
      if (key == "DATE") {
        return true;
      } else {
        return false;
      }
    };
    $scope.isString = function (key) {
      if (key == "TEXT" || key == "LONG_TEXT") {
        return true;
      } else {
        return false;
      }
    };
    $scope.isBoolean = function (key) {
      if (key == "BOOLEAN") {
        return true;
      } else {
        return false;
      }
    };
    $scope.hasOptionSets = function (dataElement) {

      if (dataElement.optionSet != undefined) {
        return true;
      } else {
        return false;
      }
    };
    $scope.getOptionSets = function (dataElement) {
      if (dataElement.optionSet) {
        return dataElement.optionSet.options;
      } else {
        return false;
      }
    };

    dhis2.formatQueryReturnResult=function(result,tableName){
      var dataBaseStructure = sqlLiteFactory.getDataBaseStructure();
      var fields = dataBaseStructure[tableName].fields;
      var formattedQueryReturnResult = sqlLiteFactory.formatQueryReturnResult(result, fields);;
      return formattedQueryReturnResult;
    }


  })

  .controller('appsCtrl', function ($scope) {

    $scope.onSwipeLeft = function () {
      //console.log('onSwipeLeft');
    }

  })

  .controller('accountCtrl', function ($scope) {
    $scope.onSwipeRight = function () {
      //console.log('onSwipeRight');
    }
  })

  .controller('loginCtrl', function ($scope, appFactory, $q, $ionicLoading,
                                     userFactory, Notification, systemFactory,
                                     $localStorage, sqlLiteFactory,
                                     $state) {

    //variable declarations
    $scope.data = {
      user: {}
    };
    if (angular.isDefined($localStorage.app.baseUrl)) {
      $scope.data.baseUrl = $localStorage.app.baseUrl;
    }

    /**
     * setProgressMessage
     * @param message
     */
    function setProgressMessage(message) {
      $ionicLoading.show({
        template: message
      });
    }

    /**
     * hideProgressMessage
     */
    function hideProgressMessage() {
      $ionicLoading.hide();
    }

    reAuthenticatedCurrentUser();
    //@todo re-open database and checking of completed download all data
    function reAuthenticatedCurrentUser() {
      setProgressMessage('Please waiting');
      userFactory.getCurrentLoginUser().then(function (user) {
        if (user.isLogin) {
          appFactory.setAuthorizationOnHeader(user).then(function () {
            hideProgressMessage();
            var time = 1000 * 60 * 2;
            if(angular.isDefined($localStorage.app.settings)){
              if(angular.isDefined($localStorage.app.settings.synchronization)){
                if(angular.isDefined($localStorage.app.settings.synchronization.timeValue)){
                  time = $localStorage.app.settings.synchronization.timeValue;
                }
              }
            }
            appFactory.startDataSynchronization(time);
            $state.go('tabsController.apps', {}, {});
          });
        }
      }, function () {
      });
    }

    /**
     * onClickLoginButton
     */
      //@todo open database using base url and loading data to offline storage
    $scope.onClickLoginButton = function () {
      var baseUrl = $scope.data.baseUrl;
      appFactory.getFormattedBaseUrl(baseUrl).then(function (formattedUrl) {
        Notification.clearAll();
        $localStorage.app.baseUrl = formattedUrl;
        if (hasUsernameAndPasswordEntered()) {
          //set authorization header
          appFactory.setAuthorizationOnHeader($scope.data.user).then(function () {
            //authenticate user
            setProgressMessage('Authenticating user credentials');
            userFactory.authenticateUser($scope.data.user).then(function (userData) {
              //setCurrent login user
              userFactory.setCurrentUser($scope.data.user, userData).then(function () {
                //getting database name
                setProgressMessage('Prepare local storage');
                appFactory.getDataBaseName().then(function (databaseName) {
                  $localStorage.app.baseBaseName = databaseName;
                  var promises = [];
                  //table as value , tableName as key
                  angular.forEach(sqlLiteFactory.getDataBaseStructure(), function (table, tableName) {
                    promises.push(
                      sqlLiteFactory.createTable(tableName, table.fields).then(function () {
                        //console.log('create table :: ' + tableName);
                      }, function () {
                        Notification('Fail create table :: ' + tableName);
                      })
                    );
                  });
                  $q.all(promises).then(function () {
                    //getting dhis 2 instance system information
                    setProgressMessage('Loading system information from the server');
                    systemFactory.getDhis2InstanceSystemInfo().then(function (data) {
                      $localStorage.app.systemInformation = data;
                      downloadOrganisationUnitsData(userData.organisationUnits);
                    }, function () {
                      //error on getting system information
                      hideProgressMessage();
                      Notification.error('Fail to load System information, please checking your network connection');
                    });
                  }, function () {
                    //error on prepare database
                    hideProgressMessage();
                    Notification('Fail to prepare database');
                  });
                }, function () {
                  hideProgressMessage();
                });

              }, function () {
                hideProgressMessage();
              });
            }, function (errorStatus) {
              hideProgressMessage();
              if (errorStatus == 401) {
                //unauthorized access
                var message = 'Fail to login, please check your username or password';
                Notification.error(message);
              } else {
                //has fail to connect to server
                var message = 'Fail to connect to the server, please check server URL or Network connection';
                Notification(message);
              }
            });
          });
        }
      }, function () {
        var message = "'Please enter server url'";
        Notification(message);
      });
    };

    /**
     * downloadOrganisationUnitsData
     * @param organisationUnits
     */
    function downloadOrganisationUnitsData(organisationUnits) {
      var promises = [];
      var orgUnitId = null, fields = null, resource = "organisationUnits";
      if (organisationUnits.length > 0) {
        setProgressMessage('Downloading assigned organisation Units');
        var organisationUnitsData = [];
        organisationUnits.forEach(function (organisationUnit) {
          if (organisationUnit.id) {
            orgUnitId = organisationUnit.id;
            fields = "id,name,ancestors[id,name],dataSets[id],level,children[id,name,ancestors[id,name]," +
              "dataSets[id],level,children[id,name,ancestors[id,name],dataSets[id],level," +
              "children[id,name,ancestors[id,name],dataSets[id],level,children[id,name,ancestors[id,name]," +
              "dataSets[id],level,children[id,name,ancestors[id,name]]]]]]";
          }
          promises.push(
            systemFactory.downloadMetadata(resource, orgUnitId, fields).then(function (orgUnitData) {
              //success on downloading
              organisationUnitsData.push(orgUnitData);
            }, function () {
              //error on downloading
              hideProgressMessage();
            })
          );
        });
        $q.all(promises).then(function () {
          //saving org units
          var promises = [];
          setProgressMessage('Saving assigned organisation Units to local storage');
          organisationUnitsData.forEach(function (data) {
            promises.push(
              sqlLiteFactory.insertDataOnTable(resource, data).then(function () {
              }, function () {
              })
            );
          });
          $q.all(promises).then(function () {
            downloadingDataSets();
          }, function () {
            hideProgressMessage();
            Notification('Fail to save assigned organisation units data');
          });

        }, function () {
          Notification('Fail to download assigned organisation units data');
        });
      } else {
        Notification('You have not been assigned to any organisation Units');
      }

    }

    /**
     * downloadingDataSets
     */
    function downloadingDataSets() {
      var resource = "dataSets";
      var fields = "id,name,timelyDays,formType,version,periodType,openFuturePeriods,expiryDays,dataSetElements[dataElement[id,name,displayName,description,formName,attributeValues[value,attribute[name]],valueType,optionSet[name,options[name,id,code]],categoryCombo[id,name,categoryOptionCombos[id,name]]]],dataElements[id,name,displayName,description,formName,attributeValues[value,attribute[name]],valueType,optionSet[name,options[name,id,code]],categoryCombo[id,name,categoryOptionCombos[id,name]]]organisationUnits[id,name],sections[id],indicators[id,name,indicatorType[factor],denominatorDescription,numeratorDescription,numerator,denominator],categoryCombo[id,name,categoryOptionCombos[id,name,categoryOptions[id]],categories[id,name,categoryOptions[id,name]]]";
      setProgressMessage('Downloading data sets');
      systemFactory.downloadMetadata(resource, null, fields).then(function (dataSets) {
        //success on downloading
        var promises = [];
        var index = 1;
        dataSets[resource].forEach(function (data) {
          promises.push(
            sqlLiteFactory.insertDataOnTable(resource, data).then(function () {
              var savingPercentage = ((index / dataSets[resource].length) * 100).toFixed(2);
              setProgressMessage('Saving data sets to local storage ' + savingPercentage + "%");
              index ++;
            }, function () {
            })
          );
        });
        $q.all(promises).then(function () {
          downloadingDataSetSections();
        }, function () {
          hideProgressMessage();
          Notification('Fail to save data sets data');
        });
      }, function () {
        //error on downloading
        hideProgressMessage();
        Notification('Fail to download data sets');
      })
    }

    /**
     * downloadingDataSetSections
     */
    function downloadingDataSetSections() {
      var resource = "sections";
      var fields = "id,name,indicators[id,name,indicatorType[factor],denominatorDescription,numeratorDescription,numerator,denominator],dataElements[id,name,formName,attributeValues[value,attribute[name]],categoryCombo[id,name,categoryOptionCombos[id,name]],displayName,description,valueType,optionSet[name,options[name,id,code]]";
      setProgressMessage('Downloading sections');
      systemFactory.downloadMetadata(resource, null, fields).then(function (sections) {
        var promises = [];
        var index = 1;
        sections[resource].forEach(function (data) {
          promises.push(
            sqlLiteFactory.insertDataOnTable(resource, data).then(function () {
              var savingPercentage = ((index / sections[resource].length) * 100).toFixed(2);
              setProgressMessage('Saving sections to local storage ' + savingPercentage + "%");
              index ++;
            }, function () {
            })
          );
        });
        $q.all(promises).then(function () {
          downloadingReports();
        }, function () {
          hideProgressMessage();
          Notification('Fail to save sections data');
        });
      }, function () {
        //error on downloading
        hideProgressMessage();
        Notification('Fail to download ' + resource);
      })

    }

    /**
     * downloadingReports
     */
    function downloadingReports(){
      var resource = "reports";
      var fields = "id,name,created,type,relativePeriods,reportParams,designContent";
      var filter = "type:eq:HTML&filter=name:like:Mobile";
      systemFactory.downloadMetadata(resource, null, fields,filter).then(function (response) {
        var promises = [];
        var index = 1;
        response[resource].forEach(function (data) {
          promises.push(
            sqlLiteFactory.insertDataOnTable(resource, data).then(function () {
              var savingPercentage = ((index / response[resource].length) * 100).toFixed(2);
              setProgressMessage('Saving Reports to local storage ' + savingPercentage + "%");
              index ++;
            }, function () {
            })
          );
        });
        $q.all(promises).then(function () {
          downloadingConstants();
        }, function () {
          hideProgressMessage();
          Notification('Fail to save reports data');
        });
      }, function () {
        hideProgressMessage();
        Notification('Fail to download ' + resource);
      });
    }

    /**
     * downloadingConstants
     */
    function downloadingConstants(){
      var resource = "constants";
      var fields = "id,value";
      systemFactory.downloadMetadata(resource, null, fields).then(function (response) {
        var promises = [];
        var index = 1;
        response[resource].forEach(function (data) {
          promises.push(
            sqlLiteFactory.insertDataOnTable(resource, data).then(function () {
              var savingPercentage = ((index / response[resource].length) * 100).toFixed(2);
              setProgressMessage('Saving constants to local storage ' + savingPercentage + "%");
              index ++;
            }, function () {
            })
          );
        });
        $q.all(promises).then(function () {
          downloadingIndicators();
        }, function () {
          hideProgressMessage();
          Notification('Fail to save constants data');
        });
      }, function () {
        hideProgressMessage();
        Notification('Fail to download ' + resource);
      });
    }

    /**
     * downloadingIndicators
     */
    function downloadingIndicators(){
      var resource = "indicators";
      var fields = "id,name,indicatorType[factor],denominatorDescription,numeratorDescription,numerator,denominator";
      systemFactory.downloadMetadata(resource, null, fields).then(function (response) {
        var promises = [];
        var index = 1;
        response[resource].forEach(function (data) {
          promises.push(
            sqlLiteFactory.insertDataOnTable(resource, data).then(function () {
              var savingPercentage = ((index / response[resource].length) * 100).toFixed(2);
              setProgressMessage('Saving indicators to local storage ' + savingPercentage + "%");
              index ++;
            }, function () {
            })
          );
        });
        $q.all(promises).then(function () {
          //downloadingTrackerPrograms();
          $localStorage.app.user.isLogin = true;
          hideProgressMessage();
          var time = 1000 * 60 * 2;
          if(angular.isDefined($localStorage.app.settings)){
            if(angular.isDefined($localStorage.app.settings.synchronization)){
              if(angular.isDefined($localStorage.app.settings.synchronization.timeValue)){
                time = $localStorage.app.settings.synchronization.timeValue;
              }
            }
          }
          appFactory.startDataSynchronization(time);
          $state.go('tabsController.apps', {}, {});
        }, function () {
          hideProgressMessage();
          Notification('Fail to save indicators data');
        });
      }, function () {
        hideProgressMessage();
        Notification('Fail to download ' + resource);
      });
    }

    function  downloadingTrackerPrograms(){
      var resource = "programs";
      var fields = "id,name,version,programType,programTrackedEntityAttributes[mandatory,trackedEntityAttribute[valueType,id,displayName,optionSet[id,options[id,displayName]]]]," +
        "organisationUnits[id, displayName],programStages[id,programStageDataElements[dataElement[id,optionSet[id]]]]";
      systemFactory.downloadMetadata(resource, null, fields).then(function (response) {
        var promises = [];
        var index = 1;
        response[resource].forEach(function (data) {
          promises.push(
            sqlLiteFactory.insertDataOnTable(resource, data).then(function () {
              var savingPercentage = ((index / response[resource].length) * 100).toFixed(2);
              setProgressMessage('Saving Programs to local storage ' + savingPercentage + "%");
              index ++;
            }, function () {
            })
          );
        });
        $q.all(promises).then(function () {
          $localStorage.app.user.isLogin = true;
          hideProgressMessage();
          var time = 1000 * 60 * 2;
          if(angular.isDefined($localStorage.app.settings)){
            if(angular.isDefined($localStorage.app.settings.synchronization)){
              if(angular.isDefined($localStorage.app.settings.synchronization.timeValue)){
                time = $localStorage.app.settings.synchronization.timeValue;
              }
            }
          }
          appFactory.startDataSynchronization(time);
          $state.go('tabsController.apps', {}, {});
        }, function () {
          hideProgressMessage();
          Notification('Fail to save Programs data');
        });
      }, function () {
        hideProgressMessage();
        Notification('Fail to download ' + resource);
      });
    }

    /**
     * hasUsernameAndPasswordEntered
     * @returns {boolean}
     */
    function hasUsernameAndPasswordEntered() {
      var result = true;
      if ($scope.data.user.username == undefined) {
        Notification('Please Enter Username');
        result = false;
      } else {
        if ($scope.data.user.password == undefined) {
          Notification('Please Enter Password');
          result = false;
        }
      }
      return result;
    }

  })

  .controller('helpCtrl', function ($scope) {

  })

  .controller('dataEntryCtrl', function ($scope, $localStorage, Notification, $state, $timeout,
                                         $ionicModal, userFactory, $ionicLoading,
                                         sqlLiteFactory, organisationUnitFactory) {

    //object for data entry selection screen
    $scope.data = {
      sortedOrganisationUnits: [],
      selectedOrganisationUnit: {},
      assignedDataSetForms: [],
      selectedDataSetForm: {},
      selectedDataSetFormDimension: {},
      periodList: [],
      selectedPeriod: {},
      currentPeriodOffset: 0,
      dataEntryForm: {
        organisationUnitId: "",
        dataSetId: "",
        period: {
          iso: '',
          name: ''
        },
        attributeOptionCombo: "",
        cc: "",
        cp: "",
        hasFormLoaded : false
      },
      dataDimensionIndex: 0
    };

    /**
     * setProgressMessage
     * @param message
     */
    function setProgressMessage(message) {
      $ionicLoading.show({
        template: message
      });
    }

    /**
     * hideProgressMessage
     */
    function hideProgressMessage() {
      $ionicLoading.hide();
    }

    $scope.$on("$ionicView.afterEnter", function (event, data) {
      if ($scope.data.sortedOrganisationUnits.length == 0) {
        $timeout(function () {
          setProgressMessage('Loading Organisation Units');
          getUserAssignedOrgUnits();
        }, 100);
      }
    });

    /**
     * getUserAssignedOrgUnits
     */
    function getUserAssignedOrgUnits() {
      var resource = "organisationUnits";
      var ids = [];
      userFactory.getCurrentLoginUserUserdata().then(function (userData) {
        userData.organisationUnits.forEach(function (organisationUnit) {
          ids.push(organisationUnit.id);
        });
        sqlLiteFactory.getDataFromTableByAttributes(resource, "id", ids).then(function (assignedOrgUnits) {
          organisationUnitFactory.getSortedOrganisationUnits(assignedOrgUnits).then(function (sortedOrganisationUnits) {
            $scope.data.sortedOrganisationUnits = sortedOrganisationUnits;
            hideProgressMessage();
          });
        }, function () {
          //fail to get org units from local storage
          Notification('Fail to get assigned organisation units from local storage ');
        });
      }, function () {
      });
    }

    /**
     * getOrganisationUnitsArrayList
     * @param organisationUnits
     * @returns {Array}
     */
    function getOrganisationUnitsArrayList(organisationUnits) {
      var organisationUnitsArrayList = [];
      $localStorage.app.allOrgUnitData = {};
      organisationUnits.forEach(function (organisationUnit) {
        $localStorage.app.allOrgUnitData[organisationUnit.id] = organisationUnit.name;
        organisationUnitsArrayList.push({
          id: organisationUnit.id,
          name: organisationUnit.name,
          ancestors: organisationUnit.ancestors,
          dataSets: organisationUnit.dataSets,
          level: parseInt(organisationUnit.level)
        });
        if (organisationUnit.children) {
          getOrganisationUnitsArrayList(organisationUnit.children).forEach(function (organisationUnitChild) {
            $localStorage.app.allOrgUnitData[organisationUnitChild.id] = organisationUnitChild.name;
            organisationUnitsArrayList.push({
              id: organisationUnitChild.id,
              name: organisationUnitChild.name,
              ancestors: organisationUnitChild.ancestors,
              dataSets: organisationUnitChild.dataSets,
              level: parseInt(organisationUnitChild.level)
            });
          });
        }
      });

      return organisationUnitsArrayList;
    }

    /**
     * setSelectedOrganisationUnit
     * @param selectedOrganisationUnit
     */
    $scope.setSelectedOrganisationUnit = function (selectedOrganisationUnit) {
      if ($scope.data.selectedOrganisationUnit.id) {
        if ($scope.data.selectedOrganisationUnit.id != selectedOrganisationUnit.id) {
          //reset forms array as well as selected form if any
          $scope.data.assignedDataSetForms = [];
          $scope.data.selectedDataSetForm = {};
          $scope.data.selectedDataSetFormDimension = {};
          $scope.data.selectedPeriod = {};
          $scope.data.periodList = [];
          $scope.data.selectedOrganisationUnit = {
            id: selectedOrganisationUnit.id,
            name: selectedOrganisationUnit.name,
            level: selectedOrganisationUnit.level,
            ancestors: selectedOrganisationUnit.ancestors,
            dataSets: selectedOrganisationUnit.dataSets
          };
          loadDataSets();
        }
      } else {
        $scope.data.selectedOrganisationUnit = {
          id: selectedOrganisationUnit.id,
          name: selectedOrganisationUnit.name,
          level: selectedOrganisationUnit.level,
          ancestors: selectedOrganisationUnit.ancestors,
          dataSets: selectedOrganisationUnit.dataSets
        };
        loadDataSets();
      }
      $scope.organisationUnitsModal.hide();
    };

    /**
     * loadDataSets
     */
    function loadDataSets() {
      setProgressMessage('Loading data sets');
      var assignedDataSetFormIds = [];
      var assignedDataSetFormIdsByUserRole = [];
      var resource = "dataSets";
      userFactory.getCurrentLoginUserUserdata().then(function (userData) {
        userData.userRoles.forEach(function (userRole) {
          if (userRole.dataSets) {
            userRole.dataSets.forEach(function (dataSet) {
              assignedDataSetFormIdsByUserRole.push(dataSet.id);
            });
          }
        });
        //filter data set ids based on role and organisation unit assignment
        $scope.data.selectedOrganisationUnit.dataSets.forEach(function (dataSet) {
          if (assignedDataSetFormIdsByUserRole.indexOf(dataSet.id) != -1) {
            assignedDataSetFormIds.push(dataSet.id);
          }
        });
        sqlLiteFactory.getDataFromTableByAttributes(resource, "id", assignedDataSetFormIds).then(function (dataSets) {
          $scope.data.assignedDataSetForms = dataSets;
          assignedDataSetFormIdsByUserRole = null;
          resource = null;
          hideProgressMessage();
        }, function () {
          //fail to get org units from local storage
          Notification('Fail to get assigned data sets from local storage ');
        });
      }, function () {
      });

    }


    /**
     * setSelectedDataSetForm
     * @param selectedDataSetForm
     */
    $scope.setSelectedDataSetForm = function (selectedDataSetForm) {
      if ($scope.data.selectedDataSetForm.id) {
        if (selectedDataSetForm.id != $scope.data.selectedDataSetForm.id) {
          $scope.data.selectedPeriod = {};
          $scope.data.selectedDataSetFormDimension = {};
          $scope.data.periodList = [];
          $scope.data.currentPeriodOffset = 0;
          $scope.data.selectedDataSetForm = selectedDataSetForm;
          getPeriodSelections();
        }
      } else {
        $scope.data.selectedDataSetForm = selectedDataSetForm;
        getPeriodSelections();
      }
      $scope.dataEntryFormModal.hide();
    };

    /**
     * getPeriodSelections
     */
    function getPeriodSelections() {
      var periodType = $scope.data.selectedDataSetForm.periodType;
      var openFuturePeriods = parseInt($scope.data.selectedDataSetForm.openFuturePeriods);
      var periods = dhis2.period.generator.generateReversedPeriods(periodType, $scope.data.currentPeriodOffset);
      periods = dhis2.period.generator.filterOpenPeriods(periodType, periods, openFuturePeriods);
      if (periods.length > 0) {
        $scope.data.periodList = [];
        periods.forEach(function (period) {
          $scope.data.periodList.push({
            endDate: period.endDate,
            startDate: period.startDate,
            iso: period.iso,
            name: period.name
          });
        });
      } else {
        Notification('There is further period selection');
        $scope.data.currentPeriodOffset--;
      }
    }

    /**
     * changePeriodInterval
     * @param value
     */
    $scope.changePeriodInterval = function (value) {
      if (value == "next") {
        $scope.data.currentPeriodOffset++;
      } else {
        $scope.data.currentPeriodOffset--;
      }
      getPeriodSelections();
    };

    /**
     * setSelectedPeriod
     * @param selectedPeriod
     */
    $scope.setSelectedPeriod = function (selectedPeriod) {
      $scope.data.selectedPeriod = selectedPeriod;
      $scope.periodModal.hide();
    };

    /**
     *
     */
    $scope.redirectToDataEntryForm = function () {
      if (isAllDataSetFormCategoriesSet()) {
        $scope.data.dataEntryForm.organisationUnitId = $scope.data.selectedOrganisationUnit.id;
        $scope.data.dataEntryForm.dataSetId = $scope.data.selectedDataSetForm.id;
        $scope.data.dataEntryForm.period.iso = $scope.data.selectedPeriod.iso;
        $scope.data.dataEntryForm.period.name = $scope.data.selectedPeriod.name;
        $scope.data.dataEntryForm.hasFormLoaded = false;
        $localStorage.app.dataEntryForm = $scope.data.dataEntryForm;
        $state.go('tabsController.dataEntryForm', {}, {});
      } else {
        Notification('Please select all data dimension');
      }
    };

    $scope.hasOrgUnitChildrenOpened = {};
    $scope.toggleOrgUnit = function(orgUnit){
      if ($scope.hasOrgUnitChildrenOpened[orgUnit.id]) {
        $scope.hasOrgUnitChildrenOpened[orgUnit.id] = !$scope.hasOrgUnitChildrenOpened[orgUnit.id];
      } else {
        $scope.hasOrgUnitChildrenOpened[orgUnit.id] = true;
      }
    }

    /**
     * isAllDataSetFormCategoriesSet
     * @returns {boolean}
     */
    function isAllDataSetFormCategoriesSet() {
      var allDataSetFormCategoriesSet = false;
      $scope.data.dataEntryForm.cp = "";
      var selectedDataSetFormDimension = [];
      if ($scope.data.selectedDataSetForm.categoryCombo.name == 'default') {
        allDataSetFormCategoriesSet = true;
        $scope.data.dataEntryForm.cc = "";
      } else {
        $scope.data.dataEntryForm.cc = $scope.data.selectedDataSetForm.categoryCombo.id;
        $scope.data.selectedDataSetForm.categoryCombo.categories.forEach(function (category) {
          if ($scope.data.selectedDataSetFormDimension[category.id]) {
            if ($scope.data.dataEntryForm.cp == "") {
              $scope.data.dataEntryForm.cp += $scope.data.selectedDataSetFormDimension[category.id].id;
            } else {
              $scope.data.dataEntryForm.cp += ';' + $scope.data.selectedDataSetFormDimension[category.id].id;
            }
            selectedDataSetFormDimension.push($scope.data.selectedDataSetFormDimension[category.id]);
          }
          if (selectedDataSetFormDimension.length == $scope.data.selectedDataSetForm.categoryCombo.categories.length) {
            allDataSetFormCategoriesSet = true;
          }
        });
      }
      return allDataSetFormCategoriesSet;
    }

    /**
     * setSelectedDataSetFormDataDimension
     * @param dataDimensionIndex
     * @param selectedDataSetFormDataDimension
     */
    $scope.setSelectedDataSetFormDataDimension = function (dataDimensionIndex, selectedDataSetFormDataDimension) {
      var dataSetFormDimension = $scope.data.selectedDataSetForm.categoryCombo.categories[dataDimensionIndex]
      $scope.data.selectedDataSetFormDimension[dataSetFormDimension.id] = {
        id: selectedDataSetFormDataDimension.id,
        name: selectedDataSetFormDataDimension.name
      };
      $scope.dataSetFormDimensionModal.hide();
    };

    $ionicModal.fromTemplateUrl('templates/modal/organisationUnitsModal.html', {
      scope: $scope
    }).then(function (modal) {
      $scope.organisationUnitsModal = modal;
    });
    $ionicModal.fromTemplateUrl('templates/modal/dataEntryFormModal.html', {
      scope: $scope
    }).then(function (modal) {
      $scope.dataEntryFormModal = modal;
    });
    $ionicModal.fromTemplateUrl('templates/modal/periodSelectionModal.html', {
      scope: $scope
    }).then(function (modal) {
      $scope.periodModal = modal;
    });
    $ionicModal.fromTemplateUrl('templates/modal/openDataSetFormDimensionModal.html', {
      scope: $scope
    }).then(function (modal) {
      $scope.dataSetFormDimensionModal = modal;
    });

    /**
     * openDataSetFormDimensionModal
     * @param dataDimensionIndex
     */
    $scope.openDataSetFormDimensionModal = function (dataDimensionIndex) {
      $scope.data.dataDimensionIndex = dataDimensionIndex;
      $scope.dataSetFormDimensionModal.show();
    };

  })

  .controller('dataEntryFormCtrl', function ($scope, $localStorage,
                                             $ionicLoading, Notification,
                                             dataValuesFactory, $q,systemFactory,
                                             appFactory, sqlLiteFactory, $timeout) {

    $scope.data = {
      selectedDataSet: {},
      selectedDataSetStorageStatus: {
        online: 0,
        local: 0
      },
      entryFormMetadata: {
        isDataSetCompleted: false,
        dataSetCompleteness : {},
        dataElements: {},
        dataValues: {}
      },
      formRenderingType: '',
      formLabelPreference : '',
      dataEntryFormParameter: {},
      selectedOrgUnitObject: {},
      selectedPeriod: {},
      selectedDataSetSections: [],
      pagination : {
        currentPage : 0,
        pageSize : 0,
        numberOfPages : 0

      }
    };

    /**
     * setProgressMessage
     * @param message
     */
    function setProgressMessage(message) {
      $ionicLoading.show({
        template: message
      });
    }

    /**
     * hideProgressMessage
     */
    function hideProgressMessage() {
      $ionicLoading.hide();
    }

    $scope.$on("$ionicView.afterEnter", function (event, data) {
      $timeout(function () {
        setProgressMessage('Loading data entry form');
        getDataEntrySetValuesFromStorage();
        setFormLabelPreference();
      }, 100);
    });

    function setFormLabelPreference(){
      if(angular.isDefined($localStorage.app.settings)){
        if(angular.isDefined($localStorage.app.settings.entryForm)){
          if($localStorage.app.settings.entryForm.formLabelPreference){
            $scope.data.formLabelPreference = $localStorage.app.settings.entryForm.formLabelPreference;
          }else{
            $scope.data.formLabelPreference = "displayName";
          }
        }
      }
    }

    /**
     * getDataEntrySetValuesFromStorage
     */
    function getDataEntrySetValuesFromStorage() {
      appFactory.getAllAppInformation().then(function (allAppInformation) {
        if (allAppInformation.dataEntryForm && allAppInformation.dataEntryForm.dataSetId != "") {
          $scope.data.selectedOrgUnitObject = {
            id: allAppInformation.dataEntryForm.organisationUnitId,
            name: allAppInformation.allOrgUnitData[allAppInformation.dataEntryForm.organisationUnitId]
          };
          $scope.data.selectedPeriod = allAppInformation.dataEntryForm.period;
          $scope.data.dataEntryFormParameter = allAppInformation.dataEntryForm;
          setProgressMessage('Loading data entry form details');
          loadingDataSetDetailsFromStorage();
        } else {
          //console.log('Please make sure you select data set');
          hideProgressMessage();
        }
      }, function () {
      })
    }

    /**
     * loadingDataSetDetailsFromStorage
     */
    function loadingDataSetDetailsFromStorage() {
      var ids = [], resource = "dataSets";
      ids.push($scope.data.dataEntryFormParameter.dataSetId);
      sqlLiteFactory.getDataFromTableByAttributes(resource, "id", ids).then(function (dataSetList) {
        if (dataSetList.length > 0) {
          $scope.data.selectedDataSet = dataSetList[0];
          dataValuesFactory.getDataValuesSetAttributeOptionCombo($scope.data.dataEntryFormParameter.cc, $scope.data.dataEntryFormParameter.cp, dataSetList[0].categoryCombo.categoryOptionCombos).then(function (attributeOptionCombo) {
            $scope.data.dataEntryFormParameter.attributeOptionCombo = attributeOptionCombo;
            checkingDataSetTypeAndRenderForm();
          });

        }
        hideProgressMessage();
      }, function () {
        //fail to get org units from local storage
        Notification('Fail to get data set from local storage ');
      });
    }

    /**
     *
     */
    function checkingDataSetTypeAndRenderForm() {
      if ($scope.data.selectedDataSet.sections.length > 0) {
        $scope.data.selectedDataSetSections = [];
        $scope.data.formRenderingType = "SECTION";
        $scope.data.pagination.pageSize = 1;
        $scope.data.pagination.numberOfPages = $scope.data.selectedDataSet.sections.length;
        var ids = [], resource = "sections";
        $scope.data.selectedDataSet.sections.forEach(function (section) {
          ids.push(section.id);
        });
        setProgressMessage('Loading data entry form sections');
        sqlLiteFactory.getDataFromTableByAttributes(resource, "id", ids).then(function (sections) {
          var sectionsObject = getSectionsObject(sections);
          //alert(JSON.stringify(sectionsObject[sections[0].id]));
          $scope.data.selectedDataSet.sections.forEach(function (section) {
            $scope.data.selectedDataSetSections.push(sectionsObject[section.id]);
          });
          setProgressMessage('Downloading data values from the server');
          downLoadingDataValuesFromServer();
          sectionsObject = null;
          ids = null;
        }, function () {
          //fail to get org units from local storage
          Notification('Fail to get data set sections from local storage ');
        });
      } else {
        $scope.data.formRenderingType = 'DEFAULT';
        $scope.data.pagination.pageSize = 5;
        $scope.data.pagination.numberOfPages =Math.ceil($scope.data.selectedDataSet.dataElements.length/$scope.data.pagination.pageSize);
        downLoadingDataValuesFromServer();
      }
    }

    /**
     * navigateToNewPagination
     * @param currentPageNumber
     * @param type
     */
    $scope.navigateToNewPagination = function(currentPageNumber, type){
      if (type == 'last') {
        $scope.data.pagination.currentPage = $scope.data.pagination.numberOfPages - 1;
      }else{
        setProgressMessage('navigate to ' + currentPageNumber + 1);
        $scope.data.pagination.currentPage = currentPageNumber
      }
      hideProgressMessage();
    };

    /**
     * downLoadingDataValuesFromServer
     */
    function downLoadingDataValuesFromServer() {
      loadingDataSetCompletenessForm();
      if($localStorage.app.dataEntryForm.hasFormLoaded){
        loadingDataValuesFromLocalStorage();
      }else{
        var dataSetId = $scope.data.dataEntryFormParameter.dataSetId;
        var period = $scope.data.dataEntryFormParameter.period.iso;
        var orgUnitId = $scope.data.dataEntryFormParameter.organisationUnitId;
        var attributeOptionCombo = $scope.data.dataEntryFormParameter.attributeOptionCombo;
        setProgressMessage('Downloading data values from the server');
        dataValuesFactory.getDataValueSet(dataSetId, period, orgUnitId, attributeOptionCombo).then(function (dataValues) {
          if (dataValues.length > 0) {
            saveOnlineDataValuesToLocalStorage(dataValues);
          } else {
            loadingDataValuesFromLocalStorage();
          }
        }, function (error) {
          loadingDataValuesFromLocalStorage();
          Notification('Fail to download data values from the server');
          alert(JSON.stringify(error));
        });
      }

    }

    /**
     * saveOnlineDataValuesToLocalStorage
     * @param dataValues
     */
    //@todo privilege issues to which to be persist online or oflline data
    function saveOnlineDataValuesToLocalStorage(dataValues) {
      var promises = [], resource = "dataValues";
      var dataSetId = $scope.data.dataEntryFormParameter.dataSetId;
      var period = $scope.data.dataEntryFormParameter.period.iso;
      var orgUnitId = $scope.data.dataEntryFormParameter.organisationUnitId;
      var index = 1;
      dataValues.forEach(function (dataValue) {

        var data = {
          id: dataSetId + '-' + dataValue.dataElement + '-' + dataValue.categoryOptionCombo + '-' + period + '-' + orgUnitId,
          de: dataValue.dataElement,
          co: dataValue.categoryOptionCombo,
          pe: period,
          ou: orgUnitId,
          cc: $scope.data.dataEntryFormParameter.cc,
          cp: $scope.data.dataEntryFormParameter.cp,
          value: dataValue.value,
          syncStatus: 'synced',
          dataSetId: dataSetId
        };
        //console.log("Saving  : " + JSON.stringify(data));
        promises.push(
          sqlLiteFactory.insertDataOnTable(resource, data).then(function () {
            var savingPercentage = ((index / dataValues.length) * 100).toFixed(2);
            setProgressMessage('Saving data values to localStorage ' + savingPercentage + '%');
            index++;
          }, function () {
          })
        );
      });

      $q.all(promises).then(function () {
        $localStorage.app.dataEntryForm.hasFormLoaded = true;
        loadingDataValuesFromLocalStorage();
      }, function () {
        loadingDataValuesFromLocalStorage();
        Notification('Fail to save data values to localStorage');
      });
    }

    /**
     * loadingDataValuesFromLocalStorage
     */
    function loadingDataValuesFromLocalStorage() {
      setProgressMessage('Checking for data values from localStorage');
      var ids = [], resource = "dataValues";
      var dataSetId = $scope.data.dataEntryFormParameter.dataSetId;
      var period = $scope.data.dataEntryFormParameter.period.iso;
      var orgUnitId = $scope.data.dataEntryFormParameter.organisationUnitId;
      $scope.data.entryFormMetadata.dataElements = {};

      //prepare ids for query to local storage
      if ($scope.data.selectedDataSet.dataElements) {
        $scope.data.selectedDataSet.dataElements.forEach(function (dataElement) {
          if (dataElement.categoryCombo && dataElement.categoryCombo.categoryOptionCombos) {
            dataElement.categoryCombo.categoryOptionCombos.forEach(function (categoryOptionCombo) {
              ids.push(dataSetId + '-' + dataElement.id + '-' + categoryOptionCombo.id + '-' + period + '-' + orgUnitId);
            })
          }
          $scope.data.entryFormMetadata.dataElements[dataElement.id] = dataElement;
        });
      }

      sqlLiteFactory.getDataFromTableByAttributes(resource, "id", ids).then(function (dataValues) {
        setDataValuesForDataEntryForm(dataValues);
      }, function () {
        //fail to get org units from local storage
        Notification('Fail to get data values from local storage ');
        hideProgressMessage();
      });
    }

    function loadingDataSetCompletenessForm(){
      $scope.data.entryFormMetadata.isDataSetCompleted = false;
      $scope.data.entryFormMetadata.dataSetCompleteness = {};
      var dataSet = $scope.data.dataEntryFormParameter.dataSetId;
      var period = $scope.data.dataEntryFormParameter.period.iso;
      var orgUnit = $scope.data.dataEntryFormParameter.organisationUnitId;
      var cc = $scope.data.dataEntryFormParameter.cp;
      var cp = $scope.data.dataEntryFormParameter.cp;
      systemFactory.getDataSetCompletenessInfo(dataSet,period,orgUnit,cc,cp).then(function(dataSetCompletenessInfo){
        if(dataSetCompletenessInfo.complete){
          $scope.data.entryFormMetadata.isDataSetCompleted = dataSetCompletenessInfo.complete;
          $scope.data.entryFormMetadata.dataSetCompleteness = {
            name : dataSetCompletenessInfo.storedBy,
            date : dataSetCompletenessInfo.date
          }
        }
      },function(){});
    }

    /**
     * setDataValuesForDataEntryForm
     * @param dataValues
     */
    function setDataValuesForDataEntryForm(dataValues) {
      $scope.data.selectedDataSetStorageStatus.online = 0;
      $scope.data.selectedDataSetStorageStatus.local = 0;
      if (dataValues.length > 0) {
        $scope.data.entryFormMetadata.dataValues = {};
        dataValues.forEach(function (dataValue) {
          var fieldId = dataValue.de + '-' + dataValue.co;
          $scope.data.entryFormMetadata.dataValues[fieldId] = shouldTypeCastToInteger(dataValue.de) ? parseInt(dataValue.value) : isDataElementHasDropDown(dataValue.de) ? {
            code: dataValue.value,
            name: '',
            id: ''
          } : $scope.isDate($scope.data.entryFormMetadata.dataElements[dataValue.de].valueType)? new Date(dataValue.value):dataValue.value;
          if (dataValue.syncStatus == "synced") {
            $scope.data.selectedDataSetStorageStatus.online++;
          } else {
            $scope.data.selectedDataSetStorageStatus.local++;
          }
          fieldId = null;
        });
        hideProgressMessage();
      } else {
        hideProgressMessage();
      }
    }

    /**
     * isDataElementHasDropDown
     * @param dataElementId
     * @returns {boolean}
     */
    function isDataElementHasDropDown(dataElementId) {
      var result = false;
      if ($scope.data.entryFormMetadata.dataElements[dataElementId]) {
        if ($scope.hasOptionSets($scope.data.entryFormMetadata.dataElements[dataElementId])) {
          result = true;
        }
      }
      return result;
    }

    /**
     * shouldTypeCastToInteger
     * @param dataElementId
     * @returns {boolean}
     */
    function shouldTypeCastToInteger(dataElementId) {
      var dataElement = $scope.data.entryFormMetadata.dataElements[dataElementId];
      var result = false;
      if ($scope.isInteger(dataElement.valueType) && (!$scope.hasOptionSets(dataElement))) {
        result = true;
      }
      if ($scope.isIntegerZeroOrPositive(dataElement.valueType) && (!$scope.hasOptionSets(dataElement))) {
        result = true;
      }

      return result;
    }

    /**
     * function to handle on changes on input fields of data entry forms
     * changeDataEntryForm
     * @param dataElement
     */
    $scope.changeDataEntryForm = function (dataElement) {
      for (var key in $scope.data.entryFormMetadata.dataValues) {
        var modelValue = key.split('-');
        if (modelValue[0] == dataElement.id) {
          var value = $scope.data.entryFormMetadata.dataValues[key];
          if ($scope.data.entryFormMetadata.dataValues[key]) {
            var dataValue = {
              categoryOptionCombo: modelValue[1],
              dataElement: modelValue[0],
              value: value,
              valueType : dataElement.valueType

            };

            saveIndividualDataValue(dataValue);
            if (dataElement.attributeValues.length > 0) {
              //extendDataElementFunctions(dataElement, value);
            }
          }
        }
      }
    };


    /**
     * completeDataEntryForm
     */
    $scope.completeDataEntryForm = function(){
      var parameter = getDatSetCompletenessParameter();
      setProgressMessage('Please wait, while complete dataset form');
      systemFactory.completeOnDataSetRegistrations(parameter).then(function(){
        loadingDataSetCompletenessForm();
        $timeout(function(){
          hideProgressMessage();
        },100);
      },function(){
        hideProgressMessage();
        Notification('Fail to complete dataset form');
      });
    };

    /**
     * unCompleteDataEntryForm
     */
    $scope.unCompleteDataEntryForm = function(){
      var parameter = getDatSetCompletenessParameter();
      setProgressMessage('Please wait, while undo completion of dataset form');
      systemFactory.unDoCompleteOnDataSetRegistrations(parameter).then(function(){
        $scope.data.entryFormMetadata.isDataSetCompleted = false;
        $scope.data.entryFormMetadata.dataSetCompleteness = {};
        hideProgressMessage();
      },function(){
        hideProgressMessage();
        Notification('Fail to undo completion of dataset form');
      });
    };


    /**
     * getDatSetCompletenessParameter
     * @returns {string}
     */
    function getDatSetCompletenessParameter(){
      var dataSet = $scope.data.dataEntryFormParameter.dataSetId;
      var period = $scope.data.dataEntryFormParameter.period.iso;
      var orgUnit = $scope.data.dataEntryFormParameter.organisationUnitId;
      var cc = $scope.data.dataEntryFormParameter.cp;
      var cp = $scope.data.dataEntryFormParameter.cp;
      var parameter = "ds="+dataSet+"&pe="+period+"&ou="+orgUnit;
      if(cc != ""){
        parameter += "&cc="+cc+"&cp="+cp;
      }
      return parameter;
    }


    /**
     * saveIndividualDataValue
     * @param dataValue
     */
    function saveIndividualDataValue(dataValue) {
      var ids = [], resource = "dataValues";
      var dataSetId = $scope.data.dataEntryFormParameter.dataSetId;
      var period = $scope.data.dataEntryFormParameter.period.iso;
      var orgUnitId = $scope.data.dataEntryFormParameter.organisationUnitId;
      var id = dataSetId + '-' + dataValue.dataElement + '-' + dataValue.categoryOptionCombo + '-' + period + '-' + orgUnitId;
      var value = null;
      if(dataValue.value.code ){
        value = dataValue.value.code;
      }else{
        value = dataValue.value;
      }

      //console.log("saved " + value);

      //$scope.data.entryFormMetadata.dataElements[dataValue.dataElement]

      value = String($scope.isDate(dataValue.valueType)? formatDate(value):value);
      var data = {
        id: id,
        de: dataValue.dataElement,
        co: dataValue.categoryOptionCombo,
        pe: period,
        ou: orgUnitId,
        cc: $scope.data.dataEntryFormParameter.cc,
        cp: $scope.data.dataEntryFormParameter.cp,
        value: value,
        syncStatus: 'not synced',
        dataSetId: dataSetId
      };
      ids.push(id);
      sqlLiteFactory.getDataFromTableByAttributes(resource, "id", ids).then(function (dataValues) {
        if(dataValues.length > 0){
          if(value != dataValues[0].value){
            sqlLiteFactory.insertDataOnTable(resource, data).then(function () {
              if($scope.data.selectedDataSetStorageStatus.online > 0){
                $scope.data.selectedDataSetStorageStatus.online --;
                $scope.data.selectedDataSetStorageStatus.local ++;
              }
            }, function () {
            })
          }
        }else{
          sqlLiteFactory.insertDataOnTable(resource, data).then(function () {
            $scope.data.selectedDataSetStorageStatus.local ++;
          }, function () {
          })
        }
      }, function () {
        //fail to get org units from local storage
        Notification('Fail to get data value from local storage ');
      });
    }

    /**
     * extendDataElementFunctions
     * @param dataElement
     * @param value
     */
    function extendDataElementFunctions(dataElement, value) {
      dataElement.attributeValues.forEach(function (attributeValue) {
        if (attributeValue.attribute.name == 'extendFunction') {
          var attributeObject = eval("(" + attributeValue.value + ")");
          angular.extend(dataElement, attributeObject);
          var dataElementValue = angular.isUndefined(value.name) ? value : value.name;
          if (dataElement.events.onChange) {
            dataElement[dataElement.events.onChange](dataElementValue)
          }

          //for brn data boolean score values
          var correctScoreValue = null;
          //console.log('input values ' + dataElementValue);
          angular.forEach(dataElement.scoreValues, function (scoreValue) {
            if (dataElementValue.toString() == scoreValue.value.toString()) {
              correctScoreValue = scoreValue.figure;
              //console.log('correctScoreValue obtained : ' + correctScoreValue);
            }
          });
        }
      });
    }

    /**
     * save value from extend function
     * @param dataElementId
     * @param categoryComboId
     * @param value
     */
    function saveValue(dataElementId, categoryComboId, value) {
      var dataValue = {
        categoryOptionCombo: categoryComboId,
        dataElement: dataElementId,
        value: value
      };
      saveIndividualDataValue(dataValue);
    }

    /**
     * formatDate
     * @param value
     * @returns {string}
     */
    function formatDate(value){
      var month,date = (new Date(value));
      month = date.getMonth() + 1;
      var formattedDate = date.getFullYear() + '-';
      if(month > 9){
        formattedDate = formattedDate + month + '-';
      }else{
        formattedDate = formattedDate + '0' + month + '-';
      }
      if(date.getDate() > 9){
        formattedDate = formattedDate + date.getDate();
      }else{
        formattedDate = formattedDate + '0' +date.getDate();
      }
      return formattedDate;
    }

    /**
     * getSectionsObject
     * @param sections
     * @returns {{}}
     */
    function getSectionsObject(sections) {
      var sectionsObject = {};
      $scope.data.selectedDataSet.dataElements = [];
      sections.forEach(function (section) {
        sectionsObject[section.id] = section;
        section.dataElements.forEach(function(dataElement){
          $scope.data.selectedDataSet.dataElements.push(dataElement);
        })
      });
      return sectionsObject;
    }

    /**
     * sample extend variable
     * @type {{scoreValues: *[], updateScoreValue: attributeValues.updateScoreValue, events: {onChange: string}}}
     */
    var attributeValues = {
      scoreValues:[
        {value:"Yes",figure:0},
        {value:"Partial",figure:0},
        {value:true,figure:0},
        {value:"No",figure:0},
        {value:"[No value]",figure:" "},
        {value:"No value",figure:" "},
        {value:"NA",figure:0}
      ],
      updateScoreValue:function (value){
        var dataElementName = this.name+"_brn_scoreValue";
        var scoreDataElement = getDataElementByName(dataElementName);
        var correctScoreValue= null;
        angular.forEach(this.scoreValues,function(scoreValue){
          if(value == scoreValue.value){
            correctScoreValue=scoreValue.figure;
          }
        });
        //@todo find mechanism of identify co-value for data element so far i just pick first category Option Combos as co-value
        if(correctScoreValue != null && scoreDataElement != null){
          var de = scoreDataElement.id;
          var co = scoreDataElement.categoryCombo.categoryOptionCombos[0].id;
          saveValue(de,co,correctScoreValue);
        }
      },
      events:{onChange:"updateScoreValue"}
    };

  })

  .controller('profileCtrl', function ($scope, userFactory, sqlLiteFactory, Notification) {

    //object for profile controller
    $scope.data = {
      userInformation: {},
      userRoles: [],
      assignedOrganisationUnitsNames: [],
      assignedForms: []
    };

    //waiting for view to be render to pull data form storage
    $scope.$on("$ionicView.afterEnter", function (event, data) {
      //getting user data for profile view from local storage
      userFactory.getCurrentLoginUserUserdata().then(function (userData) {
        $scope.data.userInformation = getUserInformation(userData);
        $scope.data.userRoles = getUserRoles(userData.userRoles);
        $scope.data.assignedForms = getAssignedFormsList(userData.userRoles);
        setAssignedOrganisationUnits(userData.organisationUnits);
      }, function () {
      });
    });

    /**
     * setAssignedOrganisationUnits
     * @param organisationUnits
     */
    function setAssignedOrganisationUnits(organisationUnits) {
      var resource = "organisationUnits";
      var ids = [];
      organisationUnits.forEach(function (organisationUnit) {
        ids.push(organisationUnit.id);
      });
      sqlLiteFactory.getDataFromTableByAttributes(resource, "id", ids).then(function (assignedOrgUnits) {
        assignedOrgUnits.forEach(function (assignedOrgUnit) {
          $scope.data.assignedOrganisationUnitsNames.push(assignedOrgUnit.name);
        });
      }, function () {
        //fail to get org units from local storage
        Notification('Fail to get assigned organisation units from local storage ');
      });
    }

    /**
     * getUserInformation
     * @param userData
     * @returns {{}}
     */
    function getUserInformation(userData) {
      var userInformation = {};
      for (var key in userData) {
        if (key != "userRoles" && key != "organisationUnits") {
          userInformation[key] = userData[key];
        }
      }
      return userInformation;
    }

    /**
     * getUserRoles
     * @param userRolesWithForms
     * @returns {Array}
     */
    function getUserRoles(userRolesWithForms) {
      var userRoles = [];
      userRolesWithForms.forEach(function (userRolesWithForm) {
        userRoles.push(userRolesWithForm.name);
      });
      return userRoles;
    }

    /**
     * getAssignedFormsList
     * @param userRolesWithForms
     * @returns {Array}
     */
    function getAssignedFormsList(userRoles) {
      var assignedFormsList = [];
      userRoles.forEach(function (userRole) {
        if (userRole.dataSets) {
          userRole.dataSets.forEach(function (dataSet) {
            if (shouldAddFormIntoAssignedFormList(assignedFormsList, dataSet)) {
              assignedFormsList.push(dataSet);
            }
          })
        }
      });
      return assignedFormsList;
    }

    /**
     * shouldAddFormIntoAssigenedFormList
     * @param assignedFormsList
     * @param form
     * @returns {boolean}
     */
    function shouldAddFormIntoAssignedFormList(assignedFormsList, form) {
      var shouldAdd = true;
      assignedFormsList.forEach(function (assignedForm) {
        if (assignedForm.id == form.id) {
          shouldAdd = false;
        }
      });
      return shouldAdd;
    }

  })

  .controller('aboutCtrl', function ($scope, $localStorage,$timeout,
                                     sqlLiteFactory,$ionicLoading) {

    //object for about controller
    $scope.data = {
      appInformation: {
        Name: 'DHIS 2 Touch',
        Version: '1.05',
        'App revision': '1ab6cc0',
        'Release status': 'Release'
        //'Release' 'Snapshot'
      },
      systemInformation: {},
      storageStatus: {
        dataValues: {
          synced: {
            value: 0
          },
          unSynced: {
            value: 0
          }
        },
        events: {
          synced: {
            value: 0
          },
          unSynced: {
            value: 0
          }
        },
        metaData: {}
      }
    };

    /**
     * setProgressMessage
     * @param message
     */
    function setProgressMessage(message) {
      $ionicLoading.show({
        template: message
      });
    }

    /**
     * hideProgressMessage
     */
    function hideProgressMessage() {
      $ionicLoading.hide();
    }

    $scope.$on("$ionicView.afterEnter", function (event, data) {
      $timeout(function () {
        setProgressMessage('Loading App information');
        getSystemInformation();
      }, 100);
    });


    /**
     * getSystemInfoName
     * @param key
     * @returns {string}
     */
    $scope.getSystemInfoName = function (key) {
      return (key.charAt(0).toUpperCase() + key.slice(1)).replace(/([A-Z])/g, ' $1').trim();
    };

    /**
     * getSystemInformation
     */
    function getSystemInformation() {
      if (angular.isDefined($localStorage.app)) {
        $scope.data.systemInformation = $localStorage.app.systemInformation;
      }
      getDataValuesStatus();
    }

    function getDataValuesStatus() {
      var resource = "dataValues";
      setProgressMessage('Loading data values storage status');
      sqlLiteFactory.getDataFromTableByAttributes(resource, "syncStatus", ['synced']).then(function (syncedDataValues) {
        $scope.data.storageStatus.dataValues.synced.value = syncedDataValues.length;
        sqlLiteFactory.getDataFromTableByAttributes(resource, "syncStatus", ['not synced']).then(function (notSyncedDataValues) {
          $scope.data.storageStatus.dataValues.unSynced.value = notSyncedDataValues.length;
          hideProgressMessage();
        },function(){
          hideProgressMessage();
        });
      },function(){
        hideProgressMessage();
      });
    }

    function getMetadataStatus(){

    }
  })

  .controller('settingsCtrl', function ($scope,$localStorage,$state) {

    $scope.$on("$ionicView.afterEnter", function (event, data) {
      setSettingViewData();

    });

    function setSettingViewData(){
      if(!$localStorage.app.settings){
        $localStorage.app.settings = {};
        $localStorage.app.settings = {
          currentSelected : "",
          synchronization:{},
          entryForm : {},
          dataReset : {}
        };
      }
    }

    $scope.directToSettingDetails = function(currentSelected){
      $localStorage.app.settings.currentSelected = currentSelected;
      $state.go('tabsController.settingDetails', {}, {});
    };
  })

  .controller('dashBoardCtrl', function ($scope, $ionicLoading, $timeout) {


    /**
     * setProgressMessage
     * @param message
     */
    function setProgressMessage(message) {
      $ionicLoading.show({
        template: message
      });
    }

    /**
     * hideProgressMessage
     */
    function hideProgressMessage() {
      $ionicLoading.hide();
    }

    $scope.$on("$ionicView.afterEnter", function (event, data) {
      $timeout(function () {
        //console.log("dashboard")
      }, 100);
    });
  })

  .controller('trackerCaptureCtrl', function ($scope, $state, $ionicLoading, $timeout, $ionicModal, Notification,
                                              userFactory, sqlLiteFactory, organisationUnitFactory, $localStorage,systemFactory) {

    $scope.data = {
      sortedOrganisationUnits: [],
      selectedOrganisationUnit: {},
      assignedPrograms: [],
      selectedProgram: {}
    };

    /**
     * getUserAssignedOrgUnits
     */
    function getUserAssignedOrgUnits() {
      var resource = "organisationUnits";
      var ids = [];
      userFactory.getCurrentLoginUserUserdata().then(function (userData) {
        userData.organisationUnits.forEach(function (organisationUnit) {
          ids.push(organisationUnit.id);
        });
        sqlLiteFactory.getDataFromTableByAttributes(resource, "id", ids).then(function (assignedOrgUnits) {
          organisationUnitFactory.getSortedOrganisationUnits(assignedOrgUnits).then(function (sortedOrganisationUnits) {
            $scope.data.sortedOrganisationUnits = getOrganisationUnitsArrayList(sortedOrganisationUnits);
            hideProgressMessage();
          });
        }, function () {
          //fail to get org units from local storage
          Notification('Fail to get assigned organisation units from local storage ');
        });
      }, function () {
      });
    }

    /**
     * getOrganisationUnitsArrayList
     * @param organisationUnits
     * @returns {Array}
     */
    function getOrganisationUnitsArrayList(organisationUnits) {
      var organisationUnitsArrayList = [];
      $localStorage.app.allOrgUnitData = {};
      organisationUnits.forEach(function (organisationUnit) {
        $localStorage.app.allOrgUnitData[organisationUnit.id] = organisationUnit.name;
        organisationUnitsArrayList.push({
          id: organisationUnit.id,
          name: organisationUnit.name,
          ancestors: organisationUnit.ancestors,
          level: parseInt(organisationUnit.level)
        });
        if (organisationUnit.children) {
          getOrganisationUnitsArrayList(organisationUnit.children).forEach(function (organisationUnitChild) {
            $localStorage.app.allOrgUnitData[organisationUnitChild.id] = organisationUnitChild.name;
            organisationUnitsArrayList.push({
              id: organisationUnitChild.id,
              name: organisationUnitChild.name,
              ancestors: organisationUnitChild.ancestors,
              level: parseInt(organisationUnitChild.level)
            });
          });
        }
      });

      return organisationUnitsArrayList;
    }

    /**
     * setSelectedOrganisationUnit
     * @param selectedOrganisationUnit
     */
    $scope.setSelectedOrganisationUnit = function (selectedOrganisationUnit) {
      if ($scope.data.selectedOrganisationUnit.id) {
        if ($scope.data.selectedOrganisationUnit.id != selectedOrganisationUnit.id) {

          $scope.data.assignedPrograms = [];
          $scope.data.selectedOrganisationUnit = {
            id: selectedOrganisationUnit.id,
            name: selectedOrganisationUnit.name,
            level: selectedOrganisationUnit.level,
            ancestors: selectedOrganisationUnit.ancestors
          };
          loadPrograms();
        }
      } else {
        $scope.data.selectedOrganisationUnit = {
          id: selectedOrganisationUnit.id,
          name: selectedOrganisationUnit.name,
          level: selectedOrganisationUnit.level,
          ancestors: selectedOrganisationUnit.ancestors
        };
        loadPrograms();
      }
      $scope.organisationUnitsModal.hide();
    };

    /**
     * loadPrograms
     */
    function loadPrograms() {
      setProgressMessage('Loading programs');
      var assignedProgramsIdsByUserRole = [];
      var resource = "programs";
      userFactory.getCurrentLoginUserUserdata().then(function (userData) {
        userData.userRoles.forEach(function (userRole) {
          if (userRole.programs) {
            userRole.programs.forEach(function (programs) {
              assignedProgramsIdsByUserRole.push(programs.id);
            });
          }
        });
        var programsByOrgUnitAndUserRoles =[];
        sqlLiteFactory.getDataFromTableByAttributes(resource, "id", assignedProgramsIdsByUserRole).then(function (programs) {
          programs.forEach(function(program){
            if(program.programType == 'WITH_REGISTRATION') {
              program.organisationUnits.forEach(function(organisationUnit){
                if(organisationUnit.id == $scope.data.selectedOrganisationUnit.id){
                  programsByOrgUnitAndUserRoles.push({
                    id : program.id,
                    name : program.name
                  });
                }
              })
            }
          });
          $scope.data.assignedPrograms = programsByOrgUnitAndUserRoles;
          assignedProgramsIdsByUserRole = null;
          resource = null;
          hideProgressMessage();
        }, function () {
          //fail to get org units from local storage
          Notification('Fail to get assigned programs from local storage');
          hideProgressMessage();
        });
      }, function () {
      });
    }

    var isProgramSelected = 'false';
    $scope.setSelectedProgram = function(selectedProgram) {
      if(selectedProgram.id) {
        $scope.data.selectedProgram = {
          id: selectedProgram.id,
          name: selectedProgram.name
        };
        isProgramSelected = 'true';
        $localStorage.app.tracker = {
          programId : selectedProgram.id
        };
      }
      $scope.trackerProgramModal.hide();
    };

    $scope.get_trackedEntityInstances = function() {
      setProgressMessage('Getting TrackedEntityInstances');
      systemFactory.getTrackedEntityInstances($scope.data.selectedOrganisationUnit.id,$scope.data.selectedProgram.id).then(function(result){
        $scope.data.trackedEntityInstances = result;
        hideProgressMessage();
      },function(error){
        //alert('Fail');
        hideProgressMessage();
      });
    };

    /**
     * setProgressMessage
     * @param message
     */
    function setProgressMessage(message) {
      $ionicLoading.show({
        template: message
      });
    }

    /**
     * hideProgressMessage
     */
    function hideProgressMessage() {
      $ionicLoading.hide();
    }

    $scope.$on("$ionicView.afterEnter", function (event, data) {
      //if ($scope.data.sortedOrganisationUnits.length == 0) {
      //    $timeout(function () {
      //        setProgressMessage('Loading Organisation Units');
      //        getUserAssignedOrgUnits();
      //    }, 100);
      //}
    });

    $scope.trackerReport = function(){
      $state.go('tabsController.trackerCaptureReport', {}, {});
    };

    $scope.programSummary = function(){
      $state.go('tabsController.programSummary', {}, {});
    };

    $scope.upcomingEvents = function(){
      $state.go('tabsController.upcomingEvents', {}, {});
    };

    $scope.programStatistics = function(){
      $state.go('tabsController.programStatistics', {}, {});
    };

    $scope.overdueEvents = function(){
      $state.go('tabsController.overdueEvents', {}, {});
    };

    $scope.trackerRegistrationHome = function(){
      $state.go('tabsController.trackerCapture', {}, {});
    };

    $scope.trackerRegistration = function(){
      if(isProgramSelected) {
        $state.go('tabsController.trackerRegistration', {}, {});
      } else {
        setProgressMessage('No Program selected');
        hideProgressMessage();
      }
    };

    $ionicModal.fromTemplateUrl('templates/modal/organisationUnitsModal.html', {
      scope: $scope
    }).then(function (modal) {
      $scope.organisationUnitsModal = modal;
    });

    $ionicModal.fromTemplateUrl('templates/modal/trackerProgramModal.html', {
      scope: $scope
    }).then(function (modal) {
      $scope.trackerProgramModal = modal;
    });

    $ionicModal.fromTemplateUrl('templates/modal/trackerRegistrationModal.html', {
      scope: $scope
    }).then(function (modal) {
      $scope.trackerRegistrationModal = modal;
    });
  })

  .controller('trackerRegistrationCtrl', function($scope, $ionicLoading,Notification,
                                                  $localStorage,$state,
                                                  $timeout,sqlLiteFactory) {
    var programId = [];
    programId.push($localStorage.app.tracker.programId);
    var resource = 'programs';
    sqlLiteFactory.getDataFromTableByAttributes(resource, "id", programId).then(function(trackedEntityAttributes) {
      $scope.data.program_tracked_entity_attributes = trackedEntityAttributes[0].programTrackedEntityAttributes;
    })
  })

  .controller('reportListCtrl', function ($scope, $ionicLoading,Notification,
                                          $localStorage,$state,
                                          $timeout,sqlLiteFactory) {

    $scope.data = {
      reportList : [],
      reportListObject : {}
    };

    /**
     * setProgressMessage
     * @param message
     */
    function setProgressMessage(message) {
      $ionicLoading.show({
        template: message
      });
    }

    /**
     * hideProgressMessage
     */
    function hideProgressMessage() {
      $ionicLoading.hide();
    }

    $scope.$on("$ionicView.afterEnter", function (event, data) {
      $timeout(function () {
        getReportList();
      }, 100);
    });

    /**
     * getReportList
     */
    function getReportList(){
      var resource = "reports";
      setProgressMessage('Loading reports from local storage');
      $scope.data.reportList = [];
      sqlLiteFactory.getAllDataFromTable(resource).then(function(reports){
        reports.forEach(function(report){
          $scope.data.reportList.push({
            id : report.id,
            name : report.name,
            created : report.created
          });
          $scope.data.reportListObject[report.id] = {
            name : report.name,
            reportParams : report.reportParams,
            relativePeriods : report.relativePeriods
          }
        });
        hideProgressMessage();
      },function(){
        hideProgressMessage();
        Notification('Fail to load reports from local storage');
      })
    }


    /**
     * setSelectedReport
     * @param reportId
     */
    $scope.setSelectedReport = function(reportId){
      var report = $scope.data.reportListObject[reportId];
      //console.log(report);
      $localStorage.app.report = {};
      $localStorage.app.report.selectedReport ={
        id : reportId,
        name : report.name,
        reportParams : report.reportParams,
        relativePeriods : report.relativePeriods
      } ;
      if(report.reportParams.paramOrganisationUnit || report.reportParams.paramReportingPeriod){
        $state.go('tabsController.reportParameterSelection', {}, {});
      }else{
        $state.go('tabsController.reportView', {}, {});
      }

    };

  })

  .controller('eventCaptureCtrl', function ($scope, $localStorage, sqlLiteFactory,
                                            $ionicModal, $timeout, $ionicLoading, userFactory,
                                            organisationUnitFactory) {
    //object for event capture selection screen
    $scope.data = {
      isLoadingData: false,
      sortedOrganisationUnits: [],
      selectedOrganisationUnit: {}
    };

    /**
     * setProgressMessage
     * @param message
     */
    function setProgressMessage(message) {
      $ionicLoading.show({
        template: message
      });
    }

    /**
     * hideProgressMessage
     */
    function hideProgressMessage() {
      $ionicLoading.hide();
    }

    $scope.$on("$ionicView.afterEnter", function (event, data) {
      //if ($scope.data.sortedOrganisationUnits.length == 0) {
      //    $timeout(function () {
      //        setProgressMessage('Loading Organisation Units');
      //        getUserAssignedOrgUnits();
      //    }, 100);
      //}
    });

    /**
     * getUserAssignedOrgUnits
     */
    function getUserAssignedOrgUnits() {
      var resource = "organisationUnits";
      var ids = [];
      userFactory.getCurrentLoginUserUserdata().then(function (userData) {
        userData.organisationUnits.forEach(function (organisationUnit) {
          ids.push(organisationUnit.id);
        });
        sqlLiteFactory.getDataFromTableByAttributes(resource, "id", ids).then(function (assignedOrgUnits) {
          organisationUnitFactory.getSortedOrganisationUnits(assignedOrgUnits).then(function (sortedOrganisationUnits) {
            $scope.data.sortedOrganisationUnits = getOrganisationUnitsArrayList(sortedOrganisationUnits);
            hideProgressMessage();
          });
        }, function () {
          //fail to get org units from local storage
          Notification('Fail to get assigned organisation units from local storage ');
        });
      }, function () {
      });
    }

    /**
     * getOrganisationUnitsArrayList
     * @param organisationUnits
     * @returns {Array}
     */
    function getOrganisationUnitsArrayList(organisationUnits) {
      var organisationUnitsArrayList = [];
      organisationUnits.forEach(function (organisationUnit) {
        organisationUnitsArrayList.push({
          id: organisationUnit.id,
          name: organisationUnit.name,
          ancestors: organisationUnit.ancestors,
          dataSets: organisationUnit.dataSets,
          level: parseInt(organisationUnit.level)
        });
        if (organisationUnit.children) {
          getOrganisationUnitsArrayList(organisationUnit.children).forEach(function (organisationUnitChild) {
            organisationUnitsArrayList.push({
              id: organisationUnitChild.id,
              name: organisationUnitChild.name,
              ancestors: organisationUnitChild.ancestors,
              dataSets: organisationUnitChild.dataSets,
              level: parseInt(organisationUnitChild.level)
            });
          });
        }
      });
      return organisationUnitsArrayList;
    }

    /**
     * setSelectedOrganisationUnit
     * @param sortedOrganisationUnit
     */
    $scope.setSelectedOrganisationUnit = function (sortedOrganisationUnit) {
      $scope.data.selectedOrganisationUnit = {
        id: sortedOrganisationUnit.id,
        name: sortedOrganisationUnit.name,
        level: sortedOrganisationUnit.level,
        ancestors: sortedOrganisationUnit.ancestors,
        dataSets: sortedOrganisationUnit.dataSets
      };
      var dataSetArray = [];
      //console.log($scope.data.selectedOrganisationUnit);
      $scope.organisationUnitsModal.hide();
      //loading data set list
    };

    $ionicModal.fromTemplateUrl('templates/modal/organisationUnitsModal.html', {
      scope: $scope
    }).then(function (modal) {
      $scope.organisationUnitsModal = modal;
    });
  })

  .controller('reportParameterSelectionCtrl', function ($scope, $localStorage,Notification,$state,
                                                        $ionicModal, $ionicLoading, $timeout, userFactory,
                                                        sqlLiteFactory, organisationUnitFactory) {
    //object for data entry selection screen
    $scope.data = {
      sortedOrganisationUnits: [],
      selectedOrganisationUnit: {},
      selectedPeriod : {},
      selectedReport: {},
      periodList : []

    };

    /**
     * setProgressMessage
     * @param message
     */
    function setProgressMessage(message) {
      $ionicLoading.show({
        template: message
      });
    }

    /**
     * hideProgressMessage
     */
    function hideProgressMessage() {
      $ionicLoading.hide();
    }

    $scope.$on("$ionicView.afterEnter", function (event, data) {
      if ($scope.data.sortedOrganisationUnits.length == 0) {
        $timeout(function () {
          setProgressMessage('Loading Organisation Units');
          getUserAssignedOrgUnits();
          getSelectedReportDetails();
        }, 100);
      }
    });

    /**
     * getUserAssignedOrgUnits
     */
    function getUserAssignedOrgUnits() {
      var resource = "organisationUnits";
      var ids = [];
      userFactory.getCurrentLoginUserUserdata().then(function (userData) {
        userData.organisationUnits.forEach(function (organisationUnit) {
          ids.push(organisationUnit.id);
        });
        sqlLiteFactory.getDataFromTableByAttributes(resource, "id", ids).then(function (assignedOrgUnits) {
          organisationUnitFactory.getSortedOrganisationUnits(assignedOrgUnits).then(function (sortedOrganisationUnits) {
            $scope.data.sortedOrganisationUnits = sortedOrganisationUnits
            hideProgressMessage();
          });
        }, function () {
          //fail to get org units from local storage
          Notification('Fail to get assigned organisation units from local storage ');
        });
      }, function () {
      });
    }

    /**
     * getOrganisationUnitsArrayList
     * @param organisationUnits
     * @returns {Array}
     */
    function getOrganisationUnitsArrayList(organisationUnits) {
      var organisationUnitsArrayList = [];
      organisationUnits.forEach(function (organisationUnit) {
        organisationUnitsArrayList.push({
          id: organisationUnit.id,
          name: organisationUnit.name,
          ancestors: organisationUnit.ancestors,
          level: parseInt(organisationUnit.level)
        });
        if (organisationUnit.children) {
          getOrganisationUnitsArrayList(organisationUnit.children).forEach(function (organisationUnitChild) {
            organisationUnitsArrayList.push({
              id: organisationUnitChild.id,
              name: organisationUnitChild.name,
              ancestors: organisationUnitChild.ancestors,
              level: parseInt(organisationUnitChild.level)
            });
          });
        }
      });
      return organisationUnitsArrayList;
    }

    /**
     * setSelectedOrganisationUnit
     * @param sortedOrganisationUnit
     */
    $scope.setSelectedOrganisationUnit = function (sortedOrganisationUnit) {
      $scope.data.selectedOrganisationUnit = {
        id: sortedOrganisationUnit.id,
        name: sortedOrganisationUnit.name,
        level: sortedOrganisationUnit.level,
        ancestors: sortedOrganisationUnit.ancestors
      };
      $scope.organisationUnitsModal.hide();
      if(isReportParameter()){
        setReportData();
      }
    };

    /**
     * getSelectedReportDetails
     */
    function getSelectedReportDetails(){
      $scope.data.selectedReport = $localStorage.app.report.selectedReport;
      periodOption();
    }

    /**
     * periodOption
     */
    function periodOption(){
      var year = parseInt(new Date().getFullYear());
      $scope.data.periodList = getPeriodOption(year);
    }

    /**
     * getPeriodOption
     * @param year
     * @returns {Array}
     */
    function getPeriodOption(year){
      var period = [];
      for(var i = 0; i < 10; i ++){
        var newYearValue = year --;
        period.push({
          name : newYearValue,
          iso : newYearValue
        });
      }
      return period;
    }

    /**
     * changePeriodInterval
     * @param type
     */
    $scope.changePeriodInterval = function(type){
      var year = null;
      if(type =='next'){
        year = parseInt($scope.data.periodList[0].iso);
        year +=9;
      }else{
        var periodOptionLength = $scope.data.periodList.length;
        periodOptionLength = parseInt(periodOptionLength);
        year = $scope.data.periodList[periodOptionLength-1].iso;
      }
      if(year > parseInt(new Date().getFullYear())){
        var message = "There no period option further than this at moment";
        Notification(message);
      }else{
        $scope.data.periodList = getPeriodOption(year);
      }
    };

    /**
     * setSelectedPeriod
     * @param selectedPeriod
     */
    $scope.setSelectedPeriod = function(selectedPeriod){
      $scope.data.selectedPeriod = selectedPeriod;
      $scope.periodModal.hide();
      if(isReportParameter()){
        setReportData();
      }
    };


    $scope.generateReport = function(){
      if(isReportParameter()){
        //console.log(JSON.stringify($localStorage.app.report.reportMetadata));
        $state.go('tabsController.reportView', {}, {});
      }else{
        Notification('Please select report parameter(s)');
      }
    };

    /**
     * isReportParameter
     * @returns {boolean}
     */
    function isReportParameter(){
      var result = false;
      if($scope.data.selectedReport.reportParams.paramOrganisationUnit && $scope.data.selectedReport.reportParams.paramReportingPeriod){
        if($scope.data.selectedOrganisationUnit.id && $scope.data.selectedPeriod.iso){
          result =true;
        }
      }else{
        if($scope.data.selectedReport.reportParams.paramOrganisationUnit){
          if($scope.data.selectedOrganisationUnit.id){
            result =true;
          }
        }
        if($scope.data.selectedReport.reportParams.paramReportingPeriod){
          if($scope.data.selectedPeriod.iso){
            result =true;
          }
        }
      }
      return result;
    }

    /**
     * setReportData
     */
    //@todo hard code name for orgUnit
    function setReportData(){
      var selectedOrUnit = {
        id : $scope.data.selectedOrganisationUnit.id,
        name : $scope.data.selectedOrganisationUnit.name,
        code : $scope.data.selectedOrganisationUnit.code
      };
      $localStorage.app.report.reportMetadata = {
        organisationUnit : selectedOrUnit,
        organisationUnitChildren : [],
        organisationUnitHierarchy : getOrganisationUnitHierarchy($scope.data.selectedOrganisationUnit.ancestors,selectedOrUnit),
        period : $scope.data.selectedPeriod.iso
      }
    }

    $scope.hasOrgUnitChildrenOpened = {};
    $scope.toggleOrgUnit = function(orgUnit){
      if ($scope.hasOrgUnitChildrenOpened[orgUnit.id]) {
        $scope.hasOrgUnitChildrenOpened[orgUnit.id] = !$scope.hasOrgUnitChildrenOpened[orgUnit.id];
      } else {
        $scope.hasOrgUnitChildrenOpened[orgUnit.id] = true;
      }
    };


    /**
     * getOrganisationUnitHierarchy
     * @param orgUnitAncestors
     * @param selectedOrUnit
     * @returns {Array}
     */
    function getOrganisationUnitHierarchy(orgUnitAncestors,selectedOrUnit){
      var data = [];
      var length = orgUnitAncestors.length;
      data.push(selectedOrUnit);
      for(var i=0 ;i < length; i ++){
        var index = length - [i + 1];
        data.push(orgUnitAncestors[index])
      }
      return data;
    }

    $ionicModal.fromTemplateUrl('templates/modal/organisationUnitsModal.html', {
      scope: $scope
    }).then(function (modal) {
      $scope.organisationUnitsModal = modal;
    });
    $ionicModal.fromTemplateUrl('templates/modal/periodSelectionModal.html', {
      scope: $scope
    }).then(function (modal) {
      $scope.periodModal = modal;
    });
  })

  .controller('reportViewCtrl', function ($scope,$localStorage,
                                          sqlLiteFactory,$ionicLoading,
                                          $timeout) {


    $scope.data = {
      selectedReport : {}
    };

    /**
     * setProgressMessage
     * @param message
     */
    function setProgressMessage(message) {
      $ionicLoading.show({
        template: message
      });
    }

    /**
     * hideProgressMessage
     */
    function hideProgressMessage() {
      $ionicLoading.hide();
    }

    $scope.$on("$ionicView.afterEnter", function (event, data) {
      $timeout(function(){
        getReportDesignContent();
        dhis2.database = $localStorage.app.baseBaseName;
        dhis2.report = $localStorage.app.report.reportMetadata;
      },100);
    });

    function getReportDesignContent(){
      setProgressMessage('Loading report details from  local storage');
      var reportId = $localStorage.app.report.selectedReport.id;
      var resource = "reports",ids = [];
      ids.push(reportId);
      sqlLiteFactory.getDataFromTableByAttributes(resource,'id',ids).then(function(reports){
        if(reports.length > 0){
          $scope.data.selectedReport.name = reports[0].name;
          $scope.data.selectedReport.designContent = reports[0].designContent;
        }
        hideProgressMessage();

      },function(){
        hideProgressMessage();
        Notification('Fail to load report details from  local storage');
      })
    }

  })


  .controller('eventRegisterCtrl', function ($scope) {

  })

  .controller('helpDetailsCtrl', function ($scope) {

  })

  .controller('settingDetailsCtrl', function ($scope,$localStorage,appFactory,$ionicHistory) {

    $scope.data = {
      settings : {}
    };
    $scope.defaultSyncType = "minutes";


    $scope.$on("$ionicView.afterEnter", function (event, data) {
      setSettingViewData();
    });

    function setSettingViewData(){
      if(!$localStorage.app.settings){
        $localStorage.app.settings = {};
        $localStorage.app.settings = {
          currentSelected : "",
          synchronization:{
            timeType : 'minutes',
            timeValue : 1000 * 60 * 2
          },
          entryForm : {},
          dataReset : {}
        };
        $scope.data.settings =  $localStorage.app.settings;
      }else{
        $scope.data.settings =  $localStorage.app.settings;
      }
      if($scope.data.settings.currentSelected == "synchronization"){
        setSynchronizationTimeToActualTime();
      }else if($scope.data.settings.currentSelected == "entryForm"){
        setFormLabelPreference();
      }else if($scope.data.settings.currentSelected == "dataReset"){
        //console.log('dataReset');
      }
    }

    function setSynchronizationTimeToActualTime(){
      var newValue = 1000 * 60;
      if($scope.data.settings.synchronization.timeType){
        $scope.data.syncType = $scope.data.settings.synchronization.timeType;
      }else{
        $scope.data.syncType = $scope.defaultSyncType;
        $scope.data.settings.synchronization.timeType = $scope.defaultSyncType;
      }
      if($scope.data.settings.synchronization.timeValue){
        newValue = $scope.data.settings.synchronization.timeValue;
      }
      switch($scope.data.settings.synchronization.timeType){
        case 'minutes':
          newValue = newValue/(60  * 1000);
          break;
        case 'hours':
          newValue = newValue/(60 * 60 * 1000);
          break;
      }
      $scope.data.syncTime = newValue;
    }

    function setActualTimeToSynchronizationTime(){
      var newValue = $scope.data.syncTime;
      var type = $scope.data.syncType;
      switch(type){
        case 'minutes':
          newValue = newValue * 60  * 1000;
          break;
        case 'hours':
          newValue = newValue * 60 * 60 * 1000;
          break;
      }
      $scope.data.settings.synchronization.timeValue = newValue;
      $scope.data.settings.synchronization.timeType = type;
      $localStorage.app.settings.synchronization = $scope.data.settings.synchronization;
      appFactory.stopDataSynchronization();
      appFactory.startDataSynchronization(newValue);
    }

    function setFormLabelPreference(){
      if(!$scope.data.settings.entryForm.formLabelPreference){
        $scope.data.settings.entryForm.formLabelPreference = 'formName';
      }
    }

    function saveFormLabelPreference(){

    }

    $scope.saveSetting = function(){
      if($scope.data.settings.currentSelected == "synchronization"){
        setActualTimeToSynchronizationTime();
      }else if($scope.data.settings.currentSelected == "entryForm"){
        saveFormLabelPreference();
      }else if($scope.data.settings.currentSelected == "dataReset"){
        //alert('dataReset');
      }
      $ionicHistory.goBack();
    }
  })

  .controller('updateManagerCtrl', function ($scope) {
    $scope.$on("$ionicView.afterEnter", function (event, data) {
      //console.log('update manager view has been loaded successfully');
    });
  });
