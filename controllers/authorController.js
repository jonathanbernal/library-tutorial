const Author = require('../models/Author.js');
const Book = require('../models/Book.js');
const asyncHandler = require('express-async-handler');
const { body, validationResult } = require('express-validator');

// Display list of all Authors
exports.author_list = asyncHandler(async (req, res, next) => {
    const allAuthors = await Author.find({})
        .sort({family_name: 1})
        .exec()

    res.render('author_list', { title: 'Author List', author_list: allAuthors });
});

// Detail page for a single Author
exports.author_detail = asyncHandler(async (req, res, next) => {
    const [author, allBooksByAuthor] = await Promise.all([
        Author.findById(req.params.id).exec(),
        Book.find({ author: req.params.id }, 'title summary').exec(),
    ]);

    if (author === null) {
        // No results
        const err = new Error('Author not found');
        err.status = 404
        return next(err);
    }

    res.render('author_detail', {
        title: 'Author Detail', 
        author: author,
        author_books: allBooksByAuthor,
    });
});

// Display Author create form on GET
exports.author_create_get = (req, res, next) => {
    res.render('author_form', {
        title: 'Create Author'
    })
};

// handle Author create on POST
exports.author_create_post = [
    // validate/sanitize data
    body('first_name')
        .trim()
        .isLength({ min: 1 })
        .escape()
        .withMessage('First name must be specified.'),
        // you could also check for alphanumeric characters, but
        // you shouldn't as there are languages that have special
        // characters.
    body('family_name')
        .trim()
        .isLength({ min: 1 })
        .escape()
        .withMessage('Family name must be specified.'),

    body('date_of_birth')
        .optional({ checkFalsy: true })
        .isISO8601()
        .toDate()
        .withMessage('Invalid date of birth or not specified'),

    body('date_of_death')
        .optional({ checkFalsy: true })
        .isISO8601()
        .toDate()
        .withMessage('Invalid date of death or not specified'),
    // check/create data
    asyncHandler(async (req, res, next) => {
        const errors = validationResult(req);

        const author = new Author({
            first_name: req.body.first_name,
            family_name: req.body.family_name,
            date_of_birth: req.body.date_of_birth,
            date_of_death: req.body.date_of_death,
        });

        console.log(author)

        if(!errors.isEmpty()) {
            res.render('author_form', {
                title: 'Create Form',
                author,
                errors: errors.array(),
            })
            return;
        } else {
            // Data in the form is valid
            // We are not trying to find the author as there could
            // be multiple authors with the same name.
            await author.save();
            res.redirect(author.url);
        }
    })
    // render data
]

exports.author_delete_get = asyncHandler(async (req, res, next) => {
    const [author, allBooksByAuthor] = await Promise.all([
        Author.findById(req.params.id),
        Book.find({author: req.params.id}, "title summary").exec(),
    ]);

    if (author === null) {
        // No results.
        res.redirect("/catalog/authors");
    }

    res.render("author_delete", {
        title: "Delete Author",
        author: author,
        author_books: allBooksByAuthor,
    });
});

// handle Author delete on POST
exports.author_delete_post = asyncHandler(async (req, res, next) => {
    // get details of author and all books associated with them
    const [author, allBooksByAuthor] = await Promise.all([
        Author.findById(req.params.id).exec(),
        Book.find({author: req.params.id}, 'title summary').exec(),
    ]);

    if(allBooksByAuthor.length > 0) {
        // Author has books. Render in the same way as GET route
        res.render("author_delete", {
            title: "Delete Author",
            author: author,
            author_books: allBooksByAuthor,
        });
        return;
    } else {
        // Author has no books. Delete and redirect to list of authors
        await Author.findByIdAndRemove(req.body.authorid); // this authorid is supplied by the DELETE form element.
        res.redirect('/catalog/authors');
    }
});

// Display Author update form on GET.
exports.author_update_get = asyncHandler(async (req, res, next) => {
    const author = await Author.findById(req.params.id);

    if( author === null) {
        const error = new Error('Author not found.');
        error.status = 404;
        return next(error);
    }

    res.render('author_form', {
        title: 'Update Form',
        author: author,
    });
});
  
// Handle Author update on POST.
exports.author_update_post = [
    body("first_name", "First Name must be provided.")
        .trim()
        .isLength({ min: 1 })
        .escape(),
    body("family_name")
        .trim()
        .isLength({ min: 1 })
        .escape(),
    body("date_of_birth")
        .optional({ checkFalsy: true })
        .isISO8601()
        .toDate()
        .withMessage('Invalid date of birth or not specified'),
    body("date_of_death")
        .optional({ checkFalsy: true })
        .isISO8601()
        .toDate()
        .withMessage('Invalid date of death or not specified'),

    // handle response
    asyncHandler(async (req, res, next) => {
        const errors = validationResult(req);

        const author = new Author({
            first_name: req.body.first_name,
            family_name: req.body.family_name,
            date_of_birth: req.body.date_of_birth,
            date_of_death: req.body.date_of_death,
            _id: req.params.id,
        });

        if( !errors.isEmpty() ) {
            // Send the current author with sanitized fields back to the user
            // for them to fix any mistakes.
            res.render('author_form', {
                title: 'Update Author',
                author: author,
                errors: errors.array(),
            })
        } else {
            const updatedAuthor = await Author.findByIdAndUpdate(req.params.id, author, {});

            res.redirect(updatedAuthor.url);
        }
    }),
]