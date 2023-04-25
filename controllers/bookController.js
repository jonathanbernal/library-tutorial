const Book = require("../models/Book.js");
const Author = require('../models/Author.js');
const Genre = require('../models/Genre.js');
const BookInstance = require('../models/BookInstance.js');

const { body, validationResult } = require('express-validator');
const asyncHandler = require('express-async-handler');

exports.index = asyncHandler(async (req, res, next) => {
  const [
    numBooks,
    numBookInstances,
    numAvailableBookInstances,
    numAuthors,
    numGenres
  ] = await Promise.all([
    Book.countDocuments({}).exec(),
    BookInstance.countDocuments({}).exec(),
    BookInstance.countDocuments({status: 'Available'}).exec(),
    Author.countDocuments({}).exec(),
    Genre.countDocuments({}).exec() 
  ]);

  res.render('index', {
    title: 'Local Library',
    book_count : numBooks,
    book_instance_count: numBookInstances,
    book_instance_available_count: numAvailableBookInstances,
    author_count: numAuthors,
    genre_count: numGenres,
  });
});

// Display list of all books.
exports.book_list = asyncHandler(async (req, res, next) => {
  const allBooks = await Book.find({}, 'title author')
    .sort({title: 1})
    .populate('author')
    .exec();

  res.render('book_list', {title: 'Book List', book_list: allBooks});
});

// Display detail page for a specific book.
exports.book_detail = asyncHandler(async (req, res, next) => {
  const [book, bookInstances] = await Promise.all([
    Book.findById(req.params.id).populate('author').populate('genre').exec(),
    BookInstance.find({book: req.params.id}).exec(),
  ]);

  if (book === null) {
    // No results
    const err = new Error('Book not found.');
    err.status = 404;
    return next(err);
  }

  res.render('book_detail', {
    title: book.title,
    book: book,
    book_instances: bookInstances,
  });
});



// Display book create form on GET.
exports.book_create_get = async (req, res, next) => {
  const [allAuthors, allGenres] = await Promise.all([
    Author.find().exec(),
    Genre.find().exec()
  ])

  res.render('book_form', {
    title: 'Create Book',
    authors: allAuthors,
    genres: allGenres
  });
};

// Handle book create on POST.
exports.book_create_post = [
  // convert the genre to an array
  (req, res, next) => {
    if ( !(req.body.genre instanceof Array) ) {
      if ( typeof req.body.genre === "undefined" ) req.body.genre = [];
      else req.body.genre = new Array(req.body.genre);
    }
    next();
  },
  // validate and sanitize fields
  body("title", "Title must not be empty")
    .trim()
    .isLength({ min: 1 })
    .escape(),
  body("author", "Author must not be empty")
    .trim()
    .isLength({ min: 1 })
    .escape(),
  body("summary", "Summary must not be empty")
    .trim()
    .isLength({ min: 1 })
    .escape(),
  body("isbn", "ISBN must not be empty")
    .trim()
    .isLength({ min: 1 })
    .escape(),
  body("genre.*").escape(),
  // Process request after validation and sanitazation

  asyncHandler(async (req, res, next) => {
    const errors = validationResult(req);

    // Create an object with the escaped, trimmed data
    const book = new Book({
      title: req.body.title,
      author: req.body.author,
      summary: req.body.summary,
      isbn: req.body.isbn,
      genre: req.body.genre,
    });

    if(!errors.isEmpty()) {
        // get all authors and all genres and redirect them again to the form
        const [allAuthors, allGenres] = await Promise.all([
          Author.find().exec(),
          Genre.find().exec(),
        ]);

        // Mark our selected genres as checked
        for(const genre of allGenres) {
          // if the genre is contained within the book, it is set
          // to an index property > -1. If so, generate a checked
          // property which will then be passed to the book form
          // to check the boxes for the genre the book belongs to. 
          if(book.genre.includes(genre._id)) {
            genre.checked = "true"
          }
        }
        // finally, render the form
        res.render('book_form', {
          title: 'Create Book',
          authors: allAuthors,
          genres: allGenres,
          book: book,
          errors: errors.array(),
        })
    } else {
      // Data from form is valid. Save book
      await book.save();
      res.redirect(book.url);
    }
  }),

]

// Display book delete form on GET.
exports.book_delete_get = asyncHandler(async (req, res, next) => {
  const [book, allBookInstances] = await Promise.all([
    Book.findById(req.params.id),
    BookInstance.find({book: req.params.id}).populate('book')
  ]);

  if(book === null) {
    // The book does not exist
    res.redirect('/catalog/books');
  }

  res.render('book_delete', {
    title: 'Delete Book',
    book_instances: allBookInstances,
    book: book,
  });
  
});

// Handle book delete on POST.
exports.book_delete_post = asyncHandler(async (req, res, next) => {
  const [book, allBookInstances] = await Promise.all([
    Book.findById(req.params.id).exec(),
    BookInstance.find({book: req.params.id}).populate('book'),
  ]);

  console.log(book)

  if (book === null) {
    res.redirect('/catalog/books');
    return;
  }

  if (allBookInstances.length > 0) {
    // these instances must be deleted first by the user before proceeding,
    // so re-render the delete page
    res.render('book_delete', {
      title: 'Delete Book',
      book: book,
      book_instances: allBookInstances
    });
  } else {
    // No instances. safe to delete
    await Book.findByIdAndRemove(req.body.bookid);
    res.redirect('/catalog/books');
  }
});

// Display book update form on GET.
exports.book_update_get = asyncHandler(async (req, res, next) => {
  const [book, allAuthors, allGenres] = await Promise.all([
    Book.findById(req.params.id).populate('author').populate('genre').exec(),
    Author.find().exec(),
    Genre.find().exec(),
  ]);

  if (book === null) {
    const error = new Error('Book not found.');
    error.status = 404;
    return next(err);
  }

  for (const genre of allGenres) {
    for(const book_g of book.genre) {
      if (genre._id.toString() === book_g._id.toString()) {
        genre.checked = true;
      }
    }
  }

  res.render('book_form', {
    title: 'Update Book',
    authors: allAuthors,
    genres: allGenres,
    book: book,
  });
});

// Handle book update on POST.
exports.book_update_post = [
  // convert genre to array
  (req, res, next) => {
    if (!req.body.genre instanceof Array) {
      if (req.body.genre === undefined) {
        req.body.genre = [];
      } else {
        req.body.genre = new Array(req.body.genre);
      }
    }
    next();
  },

  // validate and sanitize data
  body("title", "Title must not be empty")
    .trim()
    .isLength({ min: 1 })
    .escape(),
  body("author", "Author must not be empty")
    .trim()
    .isLength({ min: 1 })
    .escape(),
  body("summary", "Summary must not be empty")
    .trim()
    .isLength({ min: 1 })
    .escape(),
  body("isbn", "ISBN must not be empty").trim().isLength({ min: 1 }).escape(),
  body("genre.*").escape(),

  // Process request after validation and sanitization
  asyncHandler(async (req, res, next) => {
    const errors = validationResult(req);

    const book = new Book({
      title: req.body.title,
      author: req.body.author,
      summary: req.body.summary,
      isbn: req.body.isbn,
      genre: typeof req.body.genre === "undefined" ? [] : req.body.genre,
      _id: req.params.id, // this is required or a new ID will be assigned
    })

    if (!errors.isEmpty()) {
      // Get all genres and authors for the form
      const [allAuthors, allGenres] = await Promise.all([
        Author.find().exec(),
        Genre.find().exec(),
      ]);

      for (const genre of allGenres) {
        if (book.genre.includes(genre._id)) {
          genre.checked = "true";
        }
      }

      res.render("book_form", {
        title: "Update Book",
        book: book,
        genres: allGenres,
        authors: allAuthors,
        errors: errors.array(),
      });
      return;
    } else {
      // Data from this form is valid. Update the book
      const updatedBook = await Book.findByIdAndUpdate(req.params.id, book, {});
      // redirect to book url
      res.redirect(updatedBook.url);
    }
  })
]