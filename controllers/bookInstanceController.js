const BookInstance = require('../models/BookInstance.js');
const asyncHandler = require('express-async-handler');
const { body, validationResult } = require("express-validator");
const debug = require('debug')('BookInstance');

// since all instances are associated with a book, we need a reference
// to it.
const Book = require("../models/Book");

// Display list of all bookInstances
exports.bookinstance_list = asyncHandler(async (req, res, next) => {
    const allBookInstances = await BookInstance.find({}).populate('book').sort({status: 1}).exec();

    debug('Rendering book instance list');
    res.render('bookinstance_list', { 
        title: 'Book Instance List',
        bookinstance_list: allBookInstances
    })
});

// Display detail page for a specific BookInstance.
exports.bookinstance_detail = asyncHandler(async (req, res, next) => {
    const bookInstance = await BookInstance.findById(req.params.id)
        .populate("book")
        .exec();
    
    if (bookInstance === null) {
        // No results.
        const err = new Error("Book copy not found");
        err.status = 404;
        return next(err);
    }
    
    res.render("bookinstance_detail", {
        title: `Book Status for ${bookInstance.book.title}`,
        bookinstance: bookInstance,
    });
});

// Display BookInstance create form on GET.
exports.bookinstance_create_get = asyncHandler(async (req, res, next) => {
    const allBooks = await Book.find({}, 'title').exec();

    res.render('bookinstance_form', {
        title: 'Create Instance Form',
        book_list: allBooks,
    });
});

// Handle BookInstance create on POST.
exports.bookinstance_create_post = [
    // validate and sanitize fields
    body("book", "Book must be specified").trim().isLength({ min: 1 }).escape(),
    body("imprint", "Imprint must be specified")
        .trim()
        .isLength({ min: 1 })
        .escape(),
    body("status").escape(),
    body("due_back", "Invalid Date")
        .optional({ checkFalsy: true })
        .isISO8601()
        .toDate(),
    
    // Process request after validation and sanitization
    asyncHandler(async (req, res, next) => {
        // extrat validation errors from request
        const errors = validationResult(req);

        // create a BookInstance object with escaped and trimmed data
        const bookInstance = new BookInstance({
            book: req.body.book,
            imprint: req.body.imprint,
            status: req.body.status,
            due_back: req.body.due_back,
        });

        if (!errors.isEmpty()) {
            // there are errors
            // render again with sanitized values and error messages
            const allBooks = await Book.find({}, "title").exec();

            res.render('bookinstance_form', {
                title: 'Create Book Instance',
                book_list: allBooks,
                selected_book: bookInstance.book._id,
                errors: errors.array(),
                bookinstance: bookInstance,
            });
            return;
        } else {
            // data from form is valid
            await bookInstance.save();

            res.redirect(bookInstance.url);
        }
    }),
]

// Display BookInstance delete form on GET.
exports.bookinstance_delete_get = asyncHandler(async (req, res, next) => {
    const bookInstance = await BookInstance.findById(req.params.id).populate('book');

    // there are no active instances of the book
    if ( bookInstance === null ) {
        // redirect to the book url to see book instances
        res.redirect('/catalog/bookinstances');
    }

    res.render('bookinstance_delete', {
        title: 'Delete Book Instance',
        bookinstance: bookInstance,
    });
});
  
// Handle BookInstance delete on POST.
exports.bookinstance_delete_post = asyncHandler(async (req, res, next) => {
    const bookInstance = await BookInstance
        .findById(req.body.bookinstanceid)
        .populate('book');

    if(bookInstance !== null && bookInstance.status === 'Available') {
        await BookInstance.findByIdAndRemove(req.body.bookinstanceid);
        res.redirect('/catalog/bookinstances');
        return;
    } else {
        res.render('bookinstance_delete', {
            title: 'Delete Book Instance',
            bookinstance : bookInstance,
        });
    }
});

// Display BookInstance update form on GET.
exports.bookinstance_update_get = asyncHandler(async (req, res, next) => {
    const [bookInstance, allBooks] = await Promise.all([
        BookInstance.findById(req.params.id).populate('book'),
        Book.find().exec(),
    ]);

    if (bookInstance === null) {
        // book instance does not exist
        const error = new Error('Book Instance not found.');
        error.status = 404;
        return next(error);
    }

    res.render('bookinstance_form', {
        title: 'Update Book Instance', 
        book_list: allBooks,
        bookinstance: bookInstance,
        selected_book: bookInstance.book.id,
    });
});

// Handle bookinstance update on POST.
exports.bookinstance_update_post = [
    // sanitize form fields
    body('book', 'A book title must be supplied')
        .trim()
        .isLength({ min: 1 })
        .escape(),
    body('imprint')
        .optional({ checkFalsy: true})
        .trim()
        .isLength({ min: 1})
        .escape(),
    body('due_back')
        .optional({ checkFalsy: true})
        .trim()
        .isISO8601()
        .toDate(),
    body('status', 'A status must be supplied.')
        .trim()
        .isLength({ min: 1})
        .escape(),

    // handle request
    asyncHandler(async (req, res, next) => {
        const errors = validationResult(req);
        // we parse allBooks in case there is an error with the request.
        // If there is, we pass it to re-render the form page.
        const [book, allBooks] = await Promise.all([
            Book.findById(req.body.book).exec(),
            Book.find().exec(),
        ]);

        const bookInstance = new BookInstance({
            book: book,
            imprint: req.body.imprint,
            status: req.body.status,
            due_back: req.body.due_back,
            _id: req.params.id,
        });

        if( !errors.isEmpty() ) {
            // there were errors. Re-render form with current values
            res.render("bookinstance_form", {
                title: "Update Book Instance",
                bookinstance: bookInstance,
                book_list: allBooks,
                selected_book: bookInstance.book.id,
            })
        } else {
            // Book instance was found and exists, so proceed to update
            const updatedBookInstance = await BookInstance.findByIdAndUpdate(req.params.id, bookInstance, {}).exec();
            res.redirect(updatedBookInstance.url);
        }
    })
]