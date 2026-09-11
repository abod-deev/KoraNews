const { checkUserHasPermission, PERMISSIONS } = require('./dist/src/constants/permissions.js');
const userWithUsersView = { role: 'admin', isAdmin: true, permissions: ['users_view'] };
console.log('--- with users_view ---');
console.log('NEWS_VIEW:', checkUserHasPermission(userWithUsersView, PERMISSIONS.NEWS_VIEW));
console.log('PREDICTIONS_VIEW:', checkUserHasPermission(userWithUsersView, PERMISSIONS.PREDICTIONS_VIEW));
console.log('USERS_VIEW:', checkUserHasPermission(userWithUsersView, PERMISSIONS.USERS_VIEW));
console.log('NEWS_ADD:', checkUserHasPermission(userWithUsersView, PERMISSIONS.NEWS_ADD));
console.log('PREDICTIONS_CONTEST_CREATE:', checkUserHasPermission(userWithUsersView, PERMISSIONS.PREDICTIONS_CONTEST_CREATE));
