/*************************************************
 * Copyright (c) 2015 Ansible, Inc.
 *
 * All Rights Reserved
 *************************************************/

export default ['$rootScope', '$scope', 'Wait', 'CredentialTypesList',
    'GetBasePath', 'Rest', 'ProcessErrors', 'Prompt', '$state', '$filter', 'Dataset', 'rbacUiControlService', 'Alert', '$q',
    function(
        $rootScope, $scope, Wait, CredentialTypesList,
        GetBasePath, Rest, ProcessErrors, Prompt, $state, $filter, Dataset, rbacUiControlService, Alert, $q
    ) {
        var defaultUrl = GetBasePath('credential_types'),
            list = CredentialTypesList;

        init();

        function init() {
            $scope.optionsDefer = $q.defer();

            if (!($rootScope.user_is_superuser || $rootScope.user_is_system_auditor)) {
                $state.go("setup");
                Alert('Permission Error', 'You do not have permission to view, edit or create custom credential types.', 'alert-info');
            }

            $scope.canAdd = false;

            rbacUiControlService.canAdd("credential_types")
                .then(function(params) {
                    $scope.canAdd = params.canAdd;
                    $scope.options = params.options;
                    $scope.optionsDefer.resolve(params.options);
                    optionsRequestDataProcessing();
                });

            // search init
            $scope.list = list;
            $scope[`${list.iterator}_dataset`] = Dataset.data;
            $scope[list.name] = $scope[`${list.iterator}_dataset`].results;

        }

        // @todo what is going on here, and if it needs to happen in this controller make $rootScope var name more explicit
        if ($rootScope.addedItem) {
            $scope.addedItem = $rootScope.addedItem;
            delete $rootScope.addedItem;
        }

        $scope.editCredentialType = function() {
            $state.go('credentialTypes.edit', {
                credential_type_id: this.credential_type.id
            });
        };

        $scope.deleteCredentialType = function(id, name) {

            var action = function() {
                $('#prompt-modal').modal('hide');
                Wait('start');
                var url = defaultUrl + id + '/';
                Rest.setUrl(url);
                Rest.destroy()
                    .success(function() {
                        if (parseInt($state.params.credential_type_id) === id) {
                            $state.go('^', null, { reload: true });
                        } else {
                            $state.go('.', null, { reload: true });
                        }
                    })
                    .error(function(data, status) {
                        ProcessErrors($scope, data, status, null, {
                            hdr: 'Error!',
                            msg: 'Call to ' + url + ' failed. DELETE returned status: ' + status
                        });
                    });
            };

            var bodyHtml = '<div class="Prompt-bodyQuery">Are you sure you want to delete the credential type below?</div><div class="Prompt-bodyTarget">' + $filter('sanitize')(name) + '</div>';
            Prompt({
                hdr: 'Delete',
                body: bodyHtml,
                action: action,
                actionText: 'DELETE'
            });
        };

        $scope.addCredentialType = function() {
            $state.go('credentialTypes.add');
        };

        // iterate over the list and add fields like type label, after the
        // OPTIONS request returns, or the list is sorted/paginated/searched
        function optionsRequestDataProcessing(){
            $scope.optionsDefer.promise.then(function(options) {
                if($scope.list.name === 'credential_types'){
                    if ($scope[list.name] !== undefined) {
                        $scope[list.name].forEach(function(item, item_idx) {
                            var itm = $scope[list.name][item_idx];
                            // Set the item type label
                            if (list.fields.kind && options && options.actions && options.actions.GET && options.actions.GET.kind) {
                                options.actions.GET.kind.choices.forEach(function(choice) {
                                    if (choice[0] === item.kind) {
                                        itm.kind_label = choice[1];
                                    }
                                });
                            }

                        });
                    }
                }
            });
        }

        $scope.$watchCollection(`${$scope.list.name}`, function() {
                optionsRequestDataProcessing();
            }
        );

    }
];