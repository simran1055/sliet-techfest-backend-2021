const express = require('express');;
var router = express.Router();
const { getUserById, getUser, updateUser, notify, campusAmbassador, campusAmbassadorListAdmin, campusAmbassadorList, testMessage } = require("../controllers/user")
const { isAuthenticated, isSignedIn, isAdmin, isAuthenticatedFn } = require("../controllers/auth")

router.post('/user/campus-ambassador', isSignedIn, isAuthenticatedFn, campusAmbassador);
router.post('/user/campus-ambassador-list-admin', isSignedIn, isAuthenticatedFn, campusAmbassadorListAdmin);
router.post('/user/campus-ambassador-list', isSignedIn, isAuthenticatedFn, campusAmbassadorList);

router.param('userId', getUserById);
// router.get('/user/:userId', isSignedIn, isAuthenticated, isVerified, getUser);
router.get('/user/:userId', isSignedIn, isAuthenticated, getUser);
// router.get('/user/:userId', isSignedIn, isAuthenticated, isVerified, updateUser);
router.put('/user/:userId', isSignedIn, isAuthenticated, updateUser);
router.post('/user/notify', notify)
router.post('/user/test-message', testMessage)

module.exports = router;