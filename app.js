var express = require("express");
var path = require("path");
var crypto = require("crypto");
var mongoose = require("mongoose");
var multer = require("multer")
var gridFsStorage = require("multer-gridfs-storage");
var Grid = require("gridfs-stream");
var methodOverride = require("method-override");
var bodyParser = require("body-parser");
const aws = require( 'aws-sdk' );
const multerS3 = require( 'multer-s3' );

var app = express();
app.use(bodyParser.json());
app.use(methodOverride("_method"));
app.set("view engine", "ejs");




var conn = mongoose.createConnection("mongodb://localhost/upload",  { useNewUrlParser : true });

let gfs;

conn.once("open", () => {	
	gfs = Grid(conn.db, mongoose.mongo);
	gfs.collection("uploads");
})

var storage = new gridFsStorage({
	url: "mongodb://localhost/upload",
	file: (req, file) => {
		return new Promise((resolve,reject) =>{
			crypto.randomBytes(16, (err, buf) => {
				if (err) {
					return reject(err);
				}
				const filename = buf.toString("hex") + path.extname(file.originalname);
				const fileInfo = {
					filename: filename,
					bucketName: "uploads"
				};
				resolve(fileInfo)
			})
		})
	}
})




const upload = multer({ storage});



app.get("/", function (req, res) {
	gfs.files.find().toArray((err, files) => {
		if (!files || files.length === 0) {
			res.render("index", {files: false})
		} else {
			files.map(file => {
				if (file.contentType === "image/jpeg" || file.contentType === "image/png") {
					file.isImage = true;
				} else {
					file.isImage = false;   
				}
			})
			console.log(typeof files);
			res.render("index", {files, files})
		}
	})
	// res.send("index")
});

app.post("/upload", upload.array("file", 2) , function (req, res) {
	console.log(req.files);
	// res.json({ file : req.file });
	res.redirect("/")
});

app.get("/files", function (req, res) {
	gfs.files.find().toArray((err, files) => {
		if (!files || files.length === 0) {
			return res.status(404).json({
				err: "no files exist"
			});
		}
		return res.json(files);
	})
})

app.get("/files/:filename", function (req, res) {
	gfs.files.findOne({filename: req.params.filename}, (err, file) => {
		if (!file || file.length === 0) {
			return res.status(404).json({
				err: "no files exist"
			});
		}
		return res.json(file);
	})
})

app.get("/image/:filename", function (req, res) {
	gfs.files.findOne({filename: req.params.filename}, (err, file) => {
		if (!file || file.length === 0) {
			return res.status(404).json({
				err: "no files exist"
			});
		}
		if (file.contentType === "image/jpeg" || file.contentType === "img/png") {
			const readstream = gfs.createReadStream(file.filename);
			readstream.pipe(res);
		} else {
			const readstream = gfs.createReadStream(file.filename);
			res.set('Content_Type',file.contentTypes)
			readstream.pipe(res);
		}
	})
})

app.delete("/files/:id", function (req, res) {
	gfs.remove({_id: req.params.id, root: "uploads"}, function (err, gridStore) {
		if (err) {
			return res.status(404).json({err:err})
		}
		res.redirect("/");
	})
})


app.listen(10624, function () {
	console.log("the upload server is listening")
});