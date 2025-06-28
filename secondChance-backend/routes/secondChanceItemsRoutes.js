const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const router = express.Router();
const connectToDatabase = require('../models/db');
const logger = require('../logger');

// Define the upload directory path
const directoryPath = 'public/images';

// Set up storage for uploaded files
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, directoryPath); // Specify the upload directory
  },
  filename: function (req, file, cb) {
    cb(null, file.originalname); // Use the original file name
  },
});

const upload = multer({ storage: storage });


// Get all secondChanceItems
router.get('/', async (req, res, next) => {
    logger.info('/ called');
    try {
        const db = await connectToDatabase()

        const collection = db.collection("secondChanceItems");

        const secondChanceItems = await collection.find({}).toArray();

        res.json(secondChanceItems);
    } catch (e) {
        logger.console.error('oops something went wrong', e)
        next(e);
    }
});

// Add a new item
router.post('/', upload.single('file'), async (req, res, next) => {
    try {
        const db = await connectToDatabase();
        const collection = db.collection("secondChanceItems");

        let secondChanceItem = {
            name: req.body.name,
            category: req.body.category,
            condition: req.body.condition,
            zipcode: req.body.zipcode,
            age_days: parseInt(req.body.age_days),
            age_years: parseFloat(req.body.age_years),
            description: req.body.description,
            image: req.body.image,
            comments: []
        };

        if (req.body.comments) {
            try {
                secondChanceItem.comments = JSON.parse(req.body.comments);
            } catch (e) {
                console.warn("comments couldn't be parsed, using empty array");
            }
        }

        const lastItem = await collection.find().sort({ id: -1 }).limit(1).toArray();
        const lastId = lastItem.length > 0 ? parseInt(lastItem[0].id) : 0;
        secondChanceItem.id = (lastId + 1).toString();

        const date_added = Math.floor(new Date().getTime() / 1000);
        secondChanceItem.date_added = date_added;

        const result = await collection.insertOne(secondChanceItem);

        res.status(201).json(result.ops?.[0] || secondChanceItem);
    } catch (e) {
        console.error("POST error:", e);
        res.status(500).send("Internal Server Error");
    }
});


// Get a single secondChanceItem by ID
router.get('/:id', async (req, res, next) => {
    try {
        const db = await connectToDatabase();

        const collection = db.collection("secondChanceItems");

        const secondChanceItem = await collection.findOne({ id: req.params.id.toString() });

        if (!secondChanceItem) {
        return res.status(404).send("secondChanceItem not found");
        }
        res.json(secondChanceItem);
    } catch (e) {
        next(e);
    }
});

// Update and existing item
router.put('/:id', async(req, res,next) => {
    try {
        const db = await connectToDatabase();

        const collection = db.collection("secondChanceItems");

        const secondChanceItem = await collection.findOne({ id: req.params.id });

        if (!secondChanceItem) {
            logger.error('secondChanceItem not found');
            return res.status(404).json({ error: "secondChanceItem not found" });
        }
        
        secondChanceItem.category = req.body.category;
        secondChanceItem.condition = req.body.condition;
        secondChanceItem.age_days = req.body.age_days;
        secondChanceItem.description = req.body.description;
        secondChanceItem.age_years = Number((secondChanceItem.age_days / 365).toFixed(1));
        secondChanceItem.updatedAt = new Date();
        
        const updatepreloveItem = await collection.findOneAndUpdate(
            { id: req.params.id },
            { $set: secondChanceItem },
            { returnDocument: 'after' }
        );
        

        if(updatepreloveItem) {
        res.json({"uploaded":"success"});
        } else {
        res.json({"uploaded":"failed"});
        }
    } catch (e) {
        next(e);
    }
});

// Delete an existing item
router.delete('/:id', async(req, res,next) => {
    try {
        const db = await connectToDatabase();

        const collection = db.collection("secondChanceItems");

        const secondChanceItem = await collection.findOne({ id: req.params.id });

        if (!secondChanceItem) {
        logger.error('secondChanceItem not found');
        return res.status(404).json({ error: "secondChanceItem not found" });
        }

        await collection.deleteOne({ id: req.params.id });
        res.json({ deleted: "success" });


    } catch (e) {
        next(e);
    }
});

module.exports = router;
