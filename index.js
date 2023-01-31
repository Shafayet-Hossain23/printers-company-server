const express = require('express')
const app = express()
const port = process.env.PORT || 5000;
const cors = require('cors')
const jwt = require('jsonwebtoken');
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');


require('dotenv').config()
// middleware..
app.use(cors());
app.use(express.json());

app.get('/', (req, res) => {
    res.send('Hello printers!')
})



const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASSWORD}@cluster0.xazyemr.mongodb.net/?retryWrites=true&w=majority`;
const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true, serverApi: ServerApiVersion.v1 });

// jwt middleware...
function verifyJWT(req, res, next) {
    const authHeader = req?.headers?.authorization
    if (!authHeader) {
        return res.send({ message: "unauthorize users" })
    }
    const token = authHeader.split(' ')[1]
    jwt.verify(token, process.env.ACCESS_TOKEN, function (err, decoded) {
        if (err) {
            return res.send("Access forbidden")
        }
        req.decoded = decoded
        next()
    })
}

async function run() {
    try {
        const signInUser = client.db("printers").collection("userCollection");
        const categoriesCollection = client.db("printers").collection("mainCategories")
        const allCategoriesInfo = client.db("printers").collection("allCategoriesInfo")

        // ...verify admin and use it after verify JWT...
        const verifyAdmin = async (req, res, next) => {
            const decodedEmail = req?.decoded?.email
            const query = {
                email: decodedEmail
            }
            const currentUser = await signInUser.findOne(query)
            if (currentUser.status !== "admin") {
                return res.send({ message: "Access forbidden" })
            }
            next()
        }
        // get admin
        app.get('/users/admin', async (req, res) => {
            const email = req.query.email
            const query = {
                email: email
            }
            const user = await signInUser.findOne(query)
            res.send({ isAdmin: user.status === "admin" })
        })
        // jwt setup when user login and register
        app.get('/jwt', async (req, res) => {
            const email = req.query.email
            const query = {
                email: email
            }
            const user = await signInUser.findOne(query)
            if (user) {
                const token = jwt.sign({ email }, process.env.ACCESS_TOKEN, { expiresIn: "24hr" })
                return res.send({ accessToken: token })
            }
            res.send({ accessToken: '' })
        })

        // usersCollection
        app.post('/users', async (req, res) => {
            const userInfo = req.body
            const userCollection = await signInUser.insertOne(userInfo)
            res.send(userCollection)

        })

        // get categories collection
        app.get('/allCategories', verifyJWT, verifyAdmin, async (req, res) => {
            const query = {}
            const allCategories = await categoriesCollection.find(query).toArray()
            res.send(allCategories)
        })

        //post categories all info
        app.post('/categoriesInfo', verifyJWT, verifyAdmin, async (req, res) => {
            const categoryInfo = req.body
            const query = {
                date: categoryInfo.date,
                categoryName: categoryInfo.categoryName,
                subCategoryName: categoryInfo.subCategoryName
            }
            const findCategory = await allCategoriesInfo.findOne(query)
            if (!findCategory) {
                const result = await allCategoriesInfo.insertOne(categoryInfo)
                return res.send(result)
            }
            if (findCategory) {
                return res.send({ acknowledged: false, })
            }

        })
        // get categories info by individual date
        app.get('/categoriesByDate', verifyJWT, verifyAdmin, async (req, res) => {
            const userDate = req.query.date
            const query = {
                date: userDate
            }
            const result = await allCategoriesInfo.find(query).sort({ categoryName: 1 }).toArray()
            res.send(result)
        })

        // get categories by month of a year
        app.get('/categoriesByMonth', verifyJWT, verifyAdmin, async (req, res) => {
            const userMonth = req.query.month
            const userYear = req.query.year
            // console.log(userMonth, userYear)
            const query = {
                month: userMonth,
                year: userYear
            }
            const result = await allCategoriesInfo.find(query).sort({ dateNumber: 1, categoryName: 1, }).toArray()
            res.send(result)

        })

        // get categories by year
        app.get('/categoriesByYear', verifyJWT, verifyAdmin, async (req, res) => {

            const userYear = req.query.year
            // console.log(userMonth, userYear)
            const query = {

                year: userYear
            }
            const result = await allCategoriesInfo.find(query).sort({ monthNumber: 1, dateNumber: 1, categoryName: 1, }).toArray()
            res.send(result)

        })
        // get all categories information

        app.get('/categories', verifyJWT, verifyAdmin, async (req, res) => {
            const query = {}
            const result = await allCategoriesInfo.find(query).sort({ yearNumber: 1, monthNumber: 1, dateNumber: 1, categoryName: 1, }).toArray()
            res.send(result)

        })
        // get categories by category name
        app.get('/categoriesByName', verifyJWT, verifyAdmin, async (req, res) => {
            const month = req.query.month
            const year = req.query.year
            const category = req.query.category
            const query = {
                month: month,
                year: year,
                categoryName: category
            }
            const result = await allCategoriesInfo.find(query).sort({ dateNumber: 1 }).toArray()
            res.send(result)
        })

        // delete category by admin
        app.delete('/deleteCategory', verifyJWT, verifyAdmin, async (req, res) => {
            const id = req.query.id
            const query = {
                _id: ObjectId(id)
            }
            const result = await allCategoriesInfo.deleteOne(query)
            res.send(result)
        })

        // edit category 
        app.put('/editCategory', verifyJWT, verifyAdmin, async (req, res) => {
            const data = req.body
            const filter = {
                _id: ObjectId(data.id)
            }
            const dataUpdated = {
                $set: {
                    subCategoryName: data.subCategoryName,
                    amount: data.amount

                }
            }
            const result = await allCategoriesInfo.updateOne(filter, dataUpdated)
            res.send(result)
        })
        // insert new category
        app.put("/newCategory", verifyJWT, verifyAdmin, async (req, res) => {
            const data = req.body
            // console.log(data)
            const filter = {
                _id: ObjectId('63c77b76b914e965fbb9e417')
            }
            const query = {

                $push: {
                    categories: data.newCategoryName,
                }
            }
            const result = await categoriesCollection.updateOne(filter, query)
            res.send(result)
        })
    }
    finally {

    }
}
run().catch(console.log)


app.listen(port, () => {
    console.log(`Example app listening on port ${port}`)
})