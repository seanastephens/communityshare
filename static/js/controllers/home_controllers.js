(function() {
  'use strict';

  var module = angular.module(
    'communityshare.controllers.home',
    [
      'communityshare.directives.home',
      'communityshare.services.search',
      'communityshare.services.modal',
      'communityshare.services.share',
      'communityshare.services.statistics'
    ]);
  
  module.controller(
    'HomeController',
    function($scope, Session, Evnt, Conversation) {
      $scope.Session = Session;
      if (Session.activeUser) {

        // Get upcoming events for this user.
        var eventsPromise = Session.activeUser.getUpcomingEvents();
        eventsPromise.then(
          function(events) {
            $scope.upcomingShares = events;
          },
          function(message) {
            var msg = 'Failed to load upcoming shares'
            if (message) {
              msg += ': ' + message;
            }
            $scope.errorMessage = msg;
          });
        
        // Get recent conversations for this user.
        var conversationsPromise = Session.activeUser.getRecentConversations();
        conversationsPromise.then(
          function(conversations) {
            $scope.recentConversations = conversations;
          },
          function(message) {
            var msg = 'Failed to load recent conversations'
            if (message) {
              msg += ': ' + message;
            }
            $scope.errorMessage = msg;            
          });
          
      }
    });

  module.controller(
    'EducatorHomeController',
    function($scope, $location, Session, Search, makeDialog, Messages) {
      if ((Session.activeUser) && (Session.activeUser.is_educator)) {
        var searchParams = {
          'searcher_user_id': Session.activeUser.id,
          'active': true,
          'searcher_role': 'educator'
        };
        $scope.newSearch = function() {
          $location.path('/search');
        };
        $scope.deleteSearch = function(search) {
          var title = 'Delete Search';
          var msg = 'Do you really want to delete this search';
          var btns = [{result:'yes', label: 'Yes', cssClass: 'btn-primary'},
                       {result:'no', label: 'No'}];
          var d = makeDialog(title, msg, btns);
          d.result.then(
            function(result) {
              if (result === 'yes') {
                var deletePromise = search.destroy();
                deletePromise.then(
                  function() {
                    var index = $scope.activeSearches.indexOf(search);
                    if (index >= 0) {
                      $scope.activeSearches.splice(index, 1);
                    }
                  },
                  function(message) {
                    Messages.error(message);
                  });
              }
            })
        };
        var searchesPromise = Search.get_many(searchParams);
        searchesPromise.then(
          function(searches) {
            $scope.activeSearches = searches;
          },
          function() {
          });
      }
      
    });

  module.controller(
    'CommunityPartnerHomeController',
    function($scope, Session, Search, Messages, CommunityPartnerUtils) {
      $scope.properties = {};
      if (Session.activeUser && Session.activeUser.is_community_partner) {
        var searchesPromise = Session.activeUser.getSearches();
        var searchPromise = CommunityPartnerUtils.searchesPromiseToSearchPromise(
          searchesPromise);
        searchPromise.then(
          function(search) {
            $scope.search = search;
            if (search) {
              search.makeLabelDisplay();
            }
          }, 
          function(message) {
            Messages.error(message);
          });
      }
    });

  module.controller(
    'AdministratorHomeController',
    function($scope, $location, getStatistics) {
      $scope.searchText = '';
      $scope.searchForUsers = function() {
        var searchParams = {
          'searchText': $scope.searchText
        };
        $location.path('/searchusers').search(searchParams);
      };
      var statisticsPromise = getStatistics();
      $scope.statistics = [];
      statisticsPromise.then(function(statistics) {
        var dates = []
        for (var dateString in statistics) {
          var date = new Date(dateString);
          statistics[dateString].date = date;
          $scope.statistics.push(statistics[dateString]);
        }
        var comp = function(a, b) {
          if (a.date > b.date) {
            return 1;
          } else if (a.date < b.date) {
            return -1;
          } else {
            return 0;
          }
        }
        $scope.statistics.sort(comp);
        var l = $scope.statistics.length;
        $scope.statisticsDate = $scope.statistics[l-1].date;
        $scope.nTotalUsers = $scope.statistics[l-1].n_total_users;
        $scope.nTotalEvents = $scope.statistics[l-1].n_total_events_done;
        $scope.newUsersIn7Days = 0;
        $scope.eventsIn7Days = 0;
        for (var i=0; i<7; i++) {
          $scope.newUsersIn7Days += $scope.statistics[l-1-i].n_new_users;
          $scope.eventsIn7Days += $scope.statistics[l-1-i].n_events_done;
        }
        $scope.newUsersIn30Days = $scope.newUsersIn7Days;
        $scope.eventsIn30Days = $scope.eventsIn7Days;
        for (var i=7; i<30; i++) {
          $scope.newUsersIn30Days += $scope.statistics[l-1-i].n_new_users;
          $scope.eventsIn30Days += $scope.statistics[l-1-i].n_events_done;
        }
        
      });
    });

    module.controller(
    'SearchesDisplayController',
    function() {
    });

  module.controller(
    'SearchUsersController',
    function($scope, $location, $q, User, Session) {
      $scope.Session = Session;
      $scope.infoMessage = 'Searching for matching users...';
      $scope.users = undefined;
      $scope.searchText = $location.search().searchText;
      var searchForUsers = function() {
        var searchNameParams = {
          'name.ilike': '%' + $scope.searchText + '%'
        };
        var searchEmailParams = {
          'email.ilike': '%' + $scope.searchText + '%'
        };
        var byNamePromise = User.get_many(searchNameParams);
        var byEmailPromise = User.get_many(searchEmailParams);
        var combinedPromise = $q.all({byName: byNamePromise,
                                      byEmail: byEmailPromise});

        combinedPromise.then(
          function(results) {
            var users = results.byName.concat(results.byEmail);
            $scope.users = users;
            $scope.infoMessage = '';
            $scope.errorMessage = '';
          },
          function(message) {
            var msg = '';
            if (message) {
              msg = ': ' + message;
            }
            $scope.errorMessage = 'Failed to load users' + msg;
            $scope.infoMessage = '';
          });
      }
      searchForUsers();
      $scope.newSearch = function() {
        var searchParams = {
          'searchText': $scope.searchText
        };
        $location.search(searchParams);
      };
    });

})();
