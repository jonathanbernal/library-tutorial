const mongoose = require('mongoose');
const { Schema } = mongoose;
const { DateTime } = require('luxon');

const AuthorSchema = new Schema({
    first_name: { type: String, required: true, maxLength: 100 },
    family_name: { type: String, required: true, maxLength: 100 },
    date_of_birth: { type: Date },
    date_of_death: { type: Date },
});

// virtual for author's full name
AuthorSchema.virtual('name').get(function(){
    // To avoid errors in cases where an author does not have either a family name or first name
    // We want to make sure we handle the exception by returning an empty string for that case
    let fullname = '';
    if(this.first_name && this.family_name) {
        fullname = `${this.family_name}, ${this.first_name}`
    }
    if (!this.first_name || !this.family_name) {
        fullname = "";
    }
    return fullname;
});

// virtual for author's URL
AuthorSchema.virtual('url').get(function(){
    // We don't use an arrow function as we'll need the this object
    return `/catalog/author/${this._id}`;
});

AuthorSchema.virtual('iso_date_of_birth').get(function(){
    return this.date_of_birth ? DateTime.fromJSDate(this.date_of_birth).toISODate() : '';
});

AuthorSchema.virtual('iso_date_of_death').get(function(){
    return this.date_of_death ? DateTime.fromJSDate(this.date_of_death).toISODate() : '';
});

AuthorSchema.virtual('formatted_date_of_birth').get(function(){
    return this.date_of_birth ? 
        DateTime.fromJSDate(this.date_of_birth).toLocaleString(DateTime.DATE_MED) :
        '';
});

AuthorSchema.virtual('formatted_date_of_death').get(function(){
    return this.date_of_death ? 
        DateTime.fromJSDate(this.date_of_death).toLocaleString(DateTime.DATE_MED) :
        '';
});

AuthorSchema.virtual('lifespan').get(function(){
    return `${this.formatted_date_of_birth} - ${this.formatted_date_of_death}`;
})

module.exports = mongoose.model('Author', AuthorSchema);