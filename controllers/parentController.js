const Parent = require('../models/parent');
const express = require('express');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const Babysitter = require('../models/babysitter');
const mongoose = require('mongoose');
var admin = require("firebase-admin");
var fcm = require("fcm-notification");
var serviceAccount = require("../config/push-notification-key.json");
const certPath = admin.credential.cert(serviceAccount);
var FCM = new fcm(certPath);




exports.createParent = async (req, res) => {
  try {
    const { nom, prenom, email, password, nombreDesEnfants,phone } = req.body;
    const parent = new Parent({ nom, prenom, email, password, nombreDesEnfants,phone });
    salt = bcrypt.genSaltSync(10);
    cryptedPass = bcrypt.hashSync(req.body.password, salt)
    parent.password = cryptedPass;
    await parent.save();
    res.status(201).json(parent);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};


exports.getAllParents = async (req, res) => {
  try {
    const parents = await Parent.find();
    res.status(200).json(parents);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};




exports.getParentByToken = async (req, res) => {
  try {
    const parent = await Parent.findOne({token : req.params.token});
    if (parent) {
      res.status(200).json(parent);
    } else {
      res.status(404).json({ message: 'Parent not found' });
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};


exports.login = async (req, res) => {
  const { email, password } = req.body;

  try {
    const parent = await Parent.findOne({ email });
    if (!parent) {
      return res.status(401).json({ message: 'Email ou mot de passe incorrect' });
    }
    else {
      validPass = bcrypt.compareSync(req.body.password,parent.password)
    if (!validPass) {
      return res.status(401).json({ message: 'Email ou mot de passe incorrect' });
    }else {
      payload = {
        _id: parent.id,
        email:parent.email,
        name : parent.name
    }
    token = jwt.sign(payload,'123456')
    parent.token = token;
    await parent.save();
    res.status(200).json({mytokenparent:token});
    }
  } 
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Une erreur s\'est produite lors de la connexion' });
  }
};

exports.addRendezVous = async (req, res) => {
  const { date, nomParent, heure_debut, heure_fin, fcm_token } = req.body;

  if (!fcm_token) {
    return res.status(400).json({ message: 'FCM token is required' });
  }

  try {
    const parent = await Parent.findById(req.params.id);
    if (!parent) {
      return res.status(404).json({ message: 'Parent not found' });
    }

    const babysitter = await Babysitter.findById(req.params.idbaby);
    if (!babysitter) {
      return res.status(404).json({ message: 'Babysitter not found' });
    }

    const rendezVous = {
      nomParent,
      date,
      heure_debut,
      heure_fin,
    };

    babysitter.rendezVous.push(rendezVous);
    await babysitter.save();

    const message = {
      notification: {
        title: "test",
        body: 'test',
      },
      data: {
        orderId: '123456',
        orderDate: "2024-05-29",
      },
      token: fcm_token,
    };

    FCM.send(message, function (err, resp) {
      if (err) {
        console.error('Error sending notification:', err);
        return res.status(500).send({ message: err.message });
      } else {
        console.log("Notification Sent");
      }
    });

    res.status(201).json(babysitter);
  } catch (error) {
    console.error(error);
    if (error.name === 'CastError') {
      res.status(400).json({ message: 'Invalid ID format' });
    } else {
      res.status(500).json({ message: 'Internal server error' });
    }
  }
};

exports.deleteParent = async (req, res) => {
  try {
    // Extract the babysitter ID from the URL parameters
    const { id } = req.params;

    // Find the babysitter by ID and delete it from the database
    const deletedBabysitter = await Parent.findByIdAndDelete(id);

    // Check if the babysitter was found and deleted
    if (!deletedBabysitter) {
      return res.status(404).json({ message: 'Babysitter not found' });
    }

    // Respond with a success message
    res.status(200).json({ message: 'Babysitter deleted successfully' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'An error occurred while deleting the babysitter' });
  }
};



