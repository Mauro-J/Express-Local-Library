var BookInstance = require('../models/bookinstance')
var Book = require('../models/book')
var async = require('async')

const { body,validationResult } = require('express-validator/check');
const { sanitizeBody } = require('express-validator/filter');


// Exibe uma lista de todas as instancias de livros.
exports.bookinstance_list = function(req, res, next) {

  BookInstance.find()
    .populate('book')
    .exec(function (err, list_bookinstances) {
      if (err) { return next(err); }
      // Successful, so render
      res.render('bookinstance_list', { title: 'Lista de Livros Cadastrados', bookinstance_list: list_bookinstances });
    });
    
};

// Exibe uma pagina de detalhes para uma Instancia de Livro especifica.
exports.bookinstance_detail = function(req, res, next) {

    BookInstance.findById(req.params.id)
    .populate('book')
    .exec(function (err, bookinstance) {
      if (err) { return next(err); }
      if (bookinstance==null) { // No results.
          var err = new Error('Cópia do livro não encontrada');
          err.status = 404;
          return next(err);
        }
      // Successful, so render.
      res.render('bookinstance_detail', { title: 'Livro:', bookinstance:  bookinstance});
    })

};

// Exibe criar formulário de Instancia de Livro no GET.
exports.bookinstance_create_get = function(req, res, next) {       

    Book.find({},'title')
    .exec(function (err, books) {
      if (err) { return next(err); }
      // Successful, so render.
      res.render('bookinstance_form', {title: 'Cadastrar instância de livro', book_list:books});
    });
    
};

// Manipula a criação de Instancia de Livro no POST.
exports.bookinstance_create_post = [

    // Validate fields.
    body('book', 'Nome do livro deve ser especificado.').isLength({ min: 1 }).trim(),
    body('imprint', 'Editora deve ser especificada.').isLength({ min: 1 }).trim(),
    body('due_back', 'Data inválida.').optional({ checkFalsy: true }).isISO8601(),
    
    // Sanitize fields.
    sanitizeBody('book').trim().escape(),
    sanitizeBody('imprint').trim().escape(),
    sanitizeBody('status').trim().escape(),
    sanitizeBody('due_back').toDate(),
    
    // Process request after validation and sanitization.
    (req, res, next) => {

        // Extract the validation errors from a request.
        const errors = validationResult(req);

        // Create a BookInstance object with escaped and trimmed data.
        var bookinstance = new BookInstance(
          { book: req.body.book,
            imprint: req.body.imprint,
            status: req.body.status,
            due_back: req.body.due_back
           });

        if (!errors.isEmpty()) {
            // There are errors. Render form again with sanitized values and error messages.
            Book.find({},'title')
                .exec(function (err, books) {
                    if (err) { return next(err); }
                    // Successful, so render.
                    res.render('bookinstance_form', { title: 'Cadastrar instância de livro', book_list : books, selected_book : bookinstance.book._id , errors: errors.array(), bookinstance:bookinstance });
            });
            return;
        }
        else {
            // Data from form is valid.
            bookinstance.save(function (err) {
                if (err) { return next(err); }
                   // Successful - redirect to new record.
                   res.redirect(bookinstance.url);
                });
        }
    }
];

// Exibir formulário de exclusão de Instancia de Livro em GET.
exports.bookinstance_delete_get = function(req, res, next) {

    BookInstance.findById(req.params.id)
    .populate('book')
    .exec(function (err, bookinstance) {
        if (err) { return next(err); }
        if (bookinstance==null) { // No results.
            res.redirect('/catalog/bookinstances');
        }
        // Successful, so render.
        res.render('bookinstance_delete', { title: 'Excluir instância de livro', bookinstance:  bookinstance});
    })

};

// Manipula a exclusão de Instancia de Livro em POST.
exports.bookinstance_delete_post = function(req, res, next) {
    
    // Assume valid BookInstance id in field.
    BookInstance.findByIdAndRemove(req.body.id, function deleteBookInstance(err) {
        if (err) { return next(err); }
        // Success, so redirect to list of BookInstance items.
        res.redirect('/catalog/bookinstances');
        });

};


// Exibir formulário de atualização de Instancia de Livro em GET.
exports.bookinstance_update_get = function(req, res, next) {

    // Get book, authors and genres for form.
    async.parallel({
        bookinstance: function(callback) {
            BookInstance.findById(req.params.id).populate('book').exec(callback)
        },
        books: function(callback) {
            Book.find(callback)
        },

        }, function(err, results) {
            if (err) { return next(err); }
            if (results.bookinstance==null) { // No results.
                var err = new Error('Cópia do livro não encontrada.');
                err.status = 404;
                return next(err);
            }
            // Success.
            res.render('bookinstance_form', { title: 'Atualizar instância de livro', book_list : results.books, selected_book : results.bookinstance.book._id, bookinstance:results.bookinstance });
        });

};

// Manipula a atualização de Instancia de Livro em POST.
exports.bookinstance_update_post = [

    // Validate fields.
    body('book', 'O livro deve ser especificado').isLength({ min: 1 }).trim(),
    body('imprint', 'Editora deve ser especificada').isLength({ min: 1 }).trim(),
    body('due_back', 'Data inválida').optional({ checkFalsy: true }).isISO8601(),
    
    // Sanitize fields.
    sanitizeBody('book').trim().escape(),
    sanitizeBody('imprint').trim().escape(),
    sanitizeBody('status').trim().escape(),
    sanitizeBody('due_back').toDate(),
    
    // Process request after validation and sanitization.
    (req, res, next) => {

        // Extract the validation errors from a request.
        const errors = validationResult(req);

        // Create a BookInstance object with escaped/trimmed data and current id.
        var bookinstance = new BookInstance(
          { book: req.body.book,
            imprint: req.body.imprint,
            status: req.body.status,
            due_back: req.body.due_back,
            _id: req.params.id
           });

        if (!errors.isEmpty()) {
            // There are errors so render the form again, passing sanitized values and errors.
            Book.find({},'title')
                .exec(function (err, books) {
                    if (err) { return next(err); }
                    // Successful, so render.
                    res.render('bookinstance_form', { title: 'Update BookInstance', book_list : books, selected_book : bookinstance.book._id , errors: errors.array(), bookinstance:bookinstance });
            });
            return;
        }
        else {
            // Data from form is valid.
            BookInstance.findByIdAndUpdate(req.params.id, bookinstance, {}, function (err,thebookinstance) {
                if (err) { return next(err); }
                   // Successful - redirect to detail page.
                   res.redirect(thebookinstance.url);
                });
        }
    }
];