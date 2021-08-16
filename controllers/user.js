const User = require("../models/user");
const Team = require('../models/team')
const Subscribers = require('../models/subscribers');
const message = require('../utills/messages');
const { mailFn } = require('../utills/mail');
const { mailTestFn } = require('../utills/mail-test');
const { validationResult } = require('express-validator');
const { successAction, failAction } = require('../utills/response');
const { generateRandom } = require('../utills/tokens');
const uuidv4 = require('uuid');
var ejs = require("ejs");
const { verify } = require("./auth");

exports.getUserById = (req, res, next, id) => {
    User.findById(id).populate('workshopsEnrolled').populate('eventRegIn').exec((err, user) => {
        // console.log("user")
        if (err || !user) {
            return res.status(400).json({
                error: "Error while fetching user"
            })
        }
        req.profile = user

        next();
    })
}

exports.getUserId = (req, res) => {
    User.findOne(
        { email: req.body.email },
        { userId: 1, _id: 0, name: 1, isVerified: 1, isProfileComplete: 1, hasPaidEntry: 1, eventRegIn: 1 }, (err, user) => {
            // console.log(user);
            if (!user || err) {
                return res.send(failAction('User Not Found'))
            }
            // console.log('>>> event Id ', req.body.eventId);
            // console.log('>>>> eventRegIn ', user.eventRegIn);
            let inEvent = user.eventRegIn.find(x => x == req.body.eventId)

            if (inEvent) {
                return res.send(failAction('User Already registerd in Event'))
            }
            if (!user.isVerified) {
                return res.send(failAction('User Is Not Verified'))
            } if (!user.isProfileComplete) {
                return res.send(failAction('User Profile Is Not Complete'))
            } if (!user.hasPaidEntry) {
                return res.send(failAction('User has not paid entry fee'))
            }
            res.send(successAction({ name: user.name, userId: user.userId }))
        }
    )
}

exports.getUser = (req, res) => {
    req.profile.salt = undefined
    req.profile.encryPassword = undefined
    return res.json(req.profile)
}

exports.updateUser = (req, res) => {
    delete req.body['email'];
    delete req.body['role'];
    delete req.body['userId'];
    delete req.body['isProfileComplete'];
    delete req.body['isVerified'];

    const { name,
        lastName,
        email,
        phone,
        dob,
        designation,
        collegeName,
        collegeAddress,
        courseEnrolled,
        branchOfStudy,
        yearOfStudy,
        whatsappPhoneNumber,
        telegramPhoneNumber } = req.body

    if (

        !phone || !dob || !designation
        || !collegeName
        || !collegeAddress
        || !courseEnrolled
        || !branchOfStudy
        || !yearOfStudy
        || !whatsappPhoneNumber
        || !telegramPhoneNumber
    ) {
        req.body['isProfileComplete'] = 0;
    } else {
        req.body['isProfileComplete'] = 1;
    }



    User.findByIdAndUpdate(
        { _id: req.profile._id },
        {
            $set: req.body
        }, { new: true, useFindAndModify: false },
        (err, user) => {
            if (err) {
                return res.status(400).json({
                    error: "You are not authorized to update this user"
                })
            }
            user.salt = undefined;
            user.encryPassword = undefined;
            res.json(user)
        }
    )
}

exports.notify = async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(422).json({
            error: errors.array()[0].msg
        })
    }
    if (await Subscribers.findOne({ email: req.body.email })) return res.status(400).json(failAction('Email is already registerd for notification'));

    const subscriber = new Subscribers(req.body);

    subscriber.save((err, subscriber) => {
        if (err) {

            return res.status(400).json(
                failAction("Some error ocuured")
            )
        }
        let context = {
            email: req.body.email,
        };
        ejs.renderFile("public/notify.ejs", function (err, data) {
            mailFn({
                to: req.body.email,
                subject: message.notify,
                html: data
            })
        })

        res.json(successAction(context, 'Successfully'))
    })
}

// User request Campus Ambassador && Admin verify Campus Ambassador
exports.campusAmbassador = async (req, res) => {
    let payload;
    let caid;
    if (req.user.role != 2) {
        if (await User.findOne({ _id: req.user._id }, { campusAmbassador: 1, _id: 0 }) != '{}') {
            return res.send(failAction('Already registered'))
        }
        caid = req.user._id
        payload = { campusAmbassador: { refCode: generateRandom(5), isVerified: false, isActive: 1 } }
    } else {
        delete req.body['refCode'];

        //  Admin can delete suspend and verify 
        payload = { campusAmbassador: req.body };
        caid = req.body._id
    }
    User.findOneAndUpdate(
        { _id: caid },
        {
            $set: payload
        }, { new: true, useFindAndModify: false },
        (err, user) => {
            if (err) {
                return res.status(400).json({
                    error: "You are not authorized to update this user"
                })
            }
            res.send(successAction(user))
        }
    )
}


// Campus Ambassador List for Super Admin

exports.campusAmbassadorListAdmin = async (req, res) => {
    if (req.user.role == 2) {
        User.find({ "campusAmbassador.isActive": { $lt: 3 } }, { campusAmbassador: 1, name: 1, email: 1, userId: 1, isVerified: 1, isProfileComplete: 1, role: 1 }, (err, user) => {
            res.send(successAction(user))
        })
    } else {
        res.send(failAction('You are not Super admin'))
    }
}

exports.campusAmbassadorList = async (req, res) => {
    User.find({ "campusAmbassador.isVerified": true }, { campusAmbassador: 1, name: 1, email: 1, userId: 1, isVerified: 1, isProfileComplete: 1, role: 1 }, (err, user) => {
        res.send(successAction(user))
    })
}


exports.createTeam = async (req, res) => {
    let {
        totalTeamMember,
        teamMembers,
        eventId,
        teamLeader
    } = req.body
    let leaderId = req.user._id;

    // let alreadyInEvent = [];
    // let notPaidFee = [];
    // let email = [];
    // let getId = [];
    // let updateId = []

    if (totalTeamMember < teamMembers.length) {
        return res.send(failAction('Number of Team members are more then total team meambers'))
    }

    let leaderData = await User.findOne({ userId: teamLeader })

    if (!leaderData) {
        return res.send(failAction('User Not Found'))
    }
    let inEvent = leaderData.eventRegIn.find(x => x == eventId)
    if (inEvent) {
        return res.send(failAction('You are already registerd in Event'))
    }

    let allUser = await User.find({ userId: { $in: teamMembers } })
    let getId = [];
    let email = [];
    let alreadyReg = false;
    allUser.forEach(element => {
        let inEvent = element.eventRegIn.find(x => x == eventId)
        if (alreadyReg) {
            return
        }
        if (inEvent) {
            alreadyReg = true;
            return res.send(failAction(`${element.name} is already registerd in Event`))
        }
        let uuIdCode = uuidv4.v4()
        let x = {
            userId: element._id,
            inviteCode: uuIdCode,
        }
        if (leaderData._id.toString() == element._id.toString()) {
            x = {
                ...x, ...{ isAccepted: true }
            }
        }
        getId.push(x)

        if (leaderData._id.toString() != element._id.toString()) {
            email.push({
                email: element.email,
                name: element.name,
                confirm_link: "https://techfestsliet.com/?id=" + element._id + "&code=" + uuIdCode + "&event=" + eventId
            })
        }
    });

    if (alreadyReg) {
        return
    }
    let payload = req.body;
    delete payload["usersId"]
    payload = {
        ...payload, ...{
            leaderId: req.user._id,
            usersId: getId
        }
    }

    const team = new Team(payload);

    team.save((err, team) => {
        if (err) {
            // console.log(err);
            return res.status(400).json(
                failAction("Some error ocuured")
            )
        }
        res.send(team);
    })
    let updates = await User.findOneAndUpdate(
        { userId: teamLeader },
        { $push: { eventRegIn: eventId } },
        { new: true, useFindAndModify: false })

    email.forEach(element => {
        ejs.renderFile("public/testVerification.ejs", { payload: element }, function (err, data) {
            mailFn({
                to: element.email,
                subject: 'Invitation To Join Team',
                html: data
            })
        })
    });
}

exports.teamList = async (req, res) => {
    const errors = validationResult(req);

    if (!errors.isEmpty()) {
        return res.status(422).json({
            error: errors.array()[0].msg
        })
    }
    const { eventId, id } = req.body;

    let payload = {
        $or: [
            { eventId, "usersId.userId": id, "usersId.isAccepted": true },
            { eventId, leaderId: id }
        ]
    }

    let checkUser = await Team.findOne(payload, { 'usersId.inviteCode': 0 }).populate('usersId.userId', { name: 1, email: 1, userId: 1, phone: 1 })
    res.send(checkUser)
}

// Accept Team Link 
exports.acceptTeamLink = async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(422).json({
            error: errors.array()[0].msg
        })
    }

    const { code, id, eventId } = req.body;

    let checkUser = await Team.findOne({ eventId, "usersId.userId": id, "usersId.inviteCode": code })
    // return;
    if (!checkUser) {
        return res.send(failAction('User Not Found'))
    }

    await User.findOneAndUpdate({ _id: id }, { $addToSet: { eventRegIn: eventId } })

    Team.findOneAndUpdate(
        { eventId, "usersId.userId": id, "usersId.inviteCode": code },
        { $set: { "usersId.$.isAccepted": true } },
        { new: true, useFindAndModify: false },
        (err, user) => {
            if (!user || err) {
                return res.status(400).json(failAction('Something went wrong'))
            }
            return res.json(successAction('', 'verify Success'))
        }
    )
}

// Remove Team Member
exports.removeTeamMember = async (req, res) => {
    let { userToRemove, eventId } = req.body
    let userId = req.user._id
    console.log(userId);
    // return
    // let userRemoveBy = userToRemove
    let userToRemove1 = await User.findOne({userId:userToRemove})
    Team.findOne({ eventId, "usersId.userId": userToRemove1._id }, (err, user) => {
        if (err || !user) {
            return res.send(failAction('User Not Found'))
        }
        if (userId == user.leaderId || userId == userToRemove) {
            User.findOneAndUpdate(
                { "_id": userToRemove },
                { $pull: { "eventRegIn": eventId } },
                { new: true, useFindAndModify: false },
                (err, user) => {
                    if (err) {
                        return res.status(400).json(failAction('Something went wrong'))
                    }
                    if (!user) {
                        return res.status(400).json(failAction('Something went wrong'))
                    }
                    Team.findOneAndUpdate(
                        { eventId, "usersId.userId": userToRemove },
                        { $pull: { "usersId": { userId: userToRemove } } },
                        { new: true, useFindAndModify: false },
                        (err, user) => {
                            if (err) {
                                return res.status(400).json(failAction('Something went wrong'))
                            }
                            if (!user) {
                                return res.status(400).json(failAction('Something went wrong'))
                            }
                            return res.json(successAction('', 'User Left the Team'))
                        }
                    )
                }
            )
        } else {
            return res.send(failAction('You cant remove this user from Team'))
        }

    })
}

exports.updateTeam = async (req, res) => {
    let { teamMembers, totalTeamMember, eventId } = req.body;
    let updateId = [];
    let getId = [];
    let email = [];
    let payload = req.body;

    Team.findOne({ eventId, leaderId: req.user._id }, (err, user) => {
        if (err || !user) {
            return res.send(failAction('User Not Found'))
        }
        // if ((teamMembers.length && (teamMembers.length == user.totalTeamMember || teamMembers.length > user.totalTeamMember))) {
        //     return
        // }

        User.find({ userId: { $in: teamMembers } }, (err, usersData) => {
            alreadyReg = false
            usersData.forEach(element => {
                let inEvent = element.eventRegIn.find(x => x == eventId)
                if (alreadyReg) {
                    return
                }
                if (inEvent) {
                    alreadyReg = true;
                    return res.send(failAction(`${element.name} is already registerd in Event`))
                }
                let uuIdCode = uuidv4.v4()
                updateId.push(element._id)
                getId.push({
                    userId: element._id,
                    inviteCode: uuIdCode
                })
                email.push({
                    email: element.email,
                    name: element.name,
                    confirm_link: "https://techfestsliet.com/?id=" + element._id + "&code=" + uuIdCode + "&event=" + eventId
                })
            })
            if (alreadyReg) {
                return;
            }
            email.forEach(element => {
                ejs.renderFile("public/testVerification.ejs", { payload: element }, function (err, data) {
                    mailFn({
                        to: element.email,
                        subject: 'Invitation To Join Team',
                        html: data
                    })
                })
            });

            delete payload["usersId"]
            payload = {
                ...payload, ...{
                    leaderId: req.user._id,
                    usersId: getId
                }
            }
            Team.findOneAndUpdate(
                { eventId, leaderId: req.user._id },
                { $set: payload },
                { new: true, useFindAndModify: false },
                (err, user) => {
                    if (err) {
                        return res.send(failAction('Something went wrong'))
                    }
                    res.send(successAction("Invitation Email Sent to New Team Meamber"))
                }
            )

            // User.updateMany(
            //     { _id: { $in: updateId } },
            //     { $push: { eventRegIn: eventId } },
            //     { new: true, useFindAndModify: false },
            //     (err, user) => {
            //         if (err) {
            //             return res.send(failAction('Something went wrong'))
            //         }
            //         res.send(user)
            //     }
            // )
        })
    })
}

exports.testMessage = (req, res) => {
    ejs.renderFile("public/notify.ejs", function (err, data) {
        mailFn({
            to: req.body.email,
            subject: message.notify,
            html: data
        })
        res.send('Message Sent')
    })
}


////////// workshop related

exports.enrollUserinWorkshop = (req, res) => {
    let workshops = [req.workshop1._id];
    // console.log(req.profile.workshopsEnrolled)
    // console.log(req.workshop1._id)
    var flag = 0
    req.profile.workshopsEnrolled.find(ele => {
        if (ele.equals(req.workshop1._id)) {
            flag = 1
            // console.log('hoi')
        } else {
            // console.log('jdahg')
        }

    })
    if (flag == 1) {
        return res.status(400).json({
            error: "Already registered"
        })
    }

    // store this in db
    User.findOneAndUpdate(
        { _id: req.profile._id },
        { $push: { workshopsEnrolled: workshops } },
        { new: true, useFindAndModify: false },
        (err, user) => {
            if (err || !user) {
                return res.status(400).json({
                    error: "Unable to enroll in workshop"
                });
            }
            user.salt = undefined;
            user.encryPassword = undefined;
            return res.status(200).json(user)

        }
    );
}


exports.enrollUserinEvent = (req, res) => {
    let events = [req.event1._id];
    // console.log(req.profile)
    // console.log(req.workshop1)
    var flag = 0
    req.profile.eventRegIn.find(ele => {
        if (ele.equals(req.event1._id)) {
            flag = 1
            // console.log('hoi')
        } else {
            // console.log('jdahg')
        }

    })
    if (flag == 1) {
        return res.status(400).json({
            error: "Already registered"
        })
    }

    // store this in db
    User.findOneAndUpdate(
        { _id: req.profile._id },
        { $push: { eventRegIn: events } },
        { new: true, useFindAndModify: false },
        (err, user) => {
            if (err || !user) {
                return res.status(400).json({
                    error: "Unable to enroll in Event"
                });
            }
            user.salt = undefined;
            user.encryPassword = undefined;
            return res.status(200).json(user)

        }
    );
}
