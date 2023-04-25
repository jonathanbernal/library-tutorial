const Genre = require("../models/Genre.js");
const Book = require('../models/Book.js');
const asyncHandler = require('express-async-handler');
const { body, validationResult } = require('express-validator');

// Display list of all Genre.
exports.genre_list = asyncHandler(async (req, res, next) => {
  const allGenres = await Genre.find({}).sort({name: 1}).exec();

  res.render('genre_list', {
    title: 'Genre List',
    genre_list: allGenres,
  })
});

// Display detail page for a specific Genre.
exports.genre_detail = asyncHandler(async (req, res, next) => {
  // Get details of genre and associated books in parallel
  const [genre, booksInGenre] = await Promise.all([
    Genre.findById(req.params.id).exec(),
    Book.find({genre: req.params.id}, 'title summary').exec(),
  ]);

  if (genre === null) {
    // No results
    const err = new Error('Genre Not Found');
    err.status = 404;
    return next(err);
  }

  res.render('genre_detail', {
    title: 'Genre Details',
    genre: genre,
    genre_books: booksInGenre,
  });
});

// Display Genre create form on GET.
// Since this route does not throw any exceptions, 
// we can skip using asyncHandler() here
exports.genre_create_get = (req, res, next) => {
  res.render('genre_form', {
    title: 'Create Genre',
  });
};

// Handle Genre create on POST.
exports.genre_create_post = [
  body('name', 'Genre must be at least 3 characters')
    .trim() // remove leading whitespaces
    .isLength({ min: 3}) // checks if length is at least 3
    .escape(),// escapes characters to avoid XSS attacks
  
  asyncHandler(async (req, res, next) => {
    // extract validation errors from request
    const errors = validationResult(req);

    // create genre
    const genre = new Genre({ name: req.body.name });

    if(!errors.isEmpty()) {
      // re-render form with found errors
      res.render('genre_form', {
        title: 'Create Genre',
        genre,
        errors: errors.array(),
      });
      return;
    } else {
      const genreExists = await Genre.findOne({ name: req.body.name }).exec();

      if(genreExists) {
        res.redirect(genreExists.url);
      } else {
        await genre.save();

        res.redirect(genre.url);
      }
    }
  })
];

// Display Genre delete form on GET.
exports.genre_delete_get = asyncHandler(async (req, res, next) => {
  const [genre, allBooksWithGenre] = await Promise.all([
    Genre.findById(req.params.id),
    Book.find({genre: req.params.id})
  ]);

  if (genre === null) {
    // Genre doesn't exist, so redirect
    res.redirect('/catalog/genres');
  }

  res.render('genre_delete', {
    title: 'Delete Genre',
    genre: genre,
    genre_books: allBooksWithGenre,
  });
});

// Handle Genre delete on POST.
exports.genre_delete_post = asyncHandler(async (req, res, next) => {
  const [genre, allBooksWithGenre] = await Promise.all([
    Genre.findById(req.params.id).exec(),
    Book.find({genre: req.params.id}, 'title summary').exec(),
  ]);

  if (allBooksWithGenre.length > 0) {
    res.render('genre_delete', {
      title: 'Delete Genre',
      genre: genre,
      genre_books: allBooksWithGenre,
    })
    return;
  } else { 
    // the genre has no books attached to it.
    await Genre.findByIdAndRemove(req.body.genreid);
    res.redirect('/catalog/genres');
  }
});

// Display Genre update form on GET.
exports.genre_update_get = asyncHandler(async (req, res, next) => {
  const genre = await Genre.findById(req.params.id).exec();

  if( genre === null ) {
    const error = new Error('Genre does not exist.');
    error.status = 404;
    return next(error);
  } 

  res.render('genre_form', {
    title: 'Update Genre',
    genre,
  });
});

// Handle Genre update on POST.
exports.genre_update_post = [
  body('name', 'An updated genre name must be provided')
    .trim()
    .isLength({ min: 1 })
    .escape(),

  asyncHandler(async (req, res, next) => {
    // we must update all genre references, too. I think?
    // let's try to update the genre only and see what happens with the other books.
    const genre = new Genre({
      name: req.body.name,
      _id: req.params.id,
    });

    console.log(genre);

    const errors = validationResult(req);

    if( !errors.isEmpty() ) {
      res.render('genre_form', {
        title: 'Update Genre',
        genre: genre,
        errors: errors.array(),
      });

    } else {
      const updatedGenre = await Genre.findByIdAndUpdate(req.params.id, genre, {}).exec();
      res.redirect(updatedGenre.url);
    }

  })
]