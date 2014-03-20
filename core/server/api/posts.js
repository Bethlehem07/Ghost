var when                   = require('when'),
    _                      = require('lodash'),
    dataProvider           = require('../models'),
    canThis                = require('../permissions').canThis,
    filteredUserAttributes = require('./users').filteredAttributes,
    posts;

function checkPostData(postData) {
    if (_.isEmpty(postData) || _.isEmpty(postData.posts) || _.isEmpty(postData.posts[0])) {
        return when.reject({code: 400, message: 'No root key (\'posts\') provided.'});
    }
    return when.resolve(postData);
}

// ## Posts
posts = {

    // #### Browse
    // **takes:** filter / pagination parameters
    browse: function browse(options) {
        options = options || {};

        // **returns:** a promise for a page of posts in a json object
        return dataProvider.Post.findPage(options).then(function (result) {
            var i = 0,
                omitted = result;

            for (i = 0; i < omitted.posts.length; i = i + 1) {
                omitted.posts[i].author = _.omit(omitted.posts[i].author, filteredUserAttributes);
            }
            return omitted;
        });
    },

    // #### Read
    // **takes:** an identifier (id or slug?)
    read: function read(args) {
        // **returns:** a promise for a single post in a json object
        return dataProvider.Post.findOne(args).then(function (result) {
            var omitted;

            if (result) {
                omitted = result.toJSON();
                omitted.author = _.omit(omitted.author, filteredUserAttributes);
                return { posts: [ omitted ]};
            }
            return when.reject({code: 404, message: 'Post not found'});

        });
    },

    generateSlug: function getSlug(args) {
        return dataProvider.Base.Model.generateSlug(dataProvider.Post, args.title, {status: 'all'}).then(function (slug) {
            if (slug) {
                return slug;
            }
            return when.reject({code: 500, message: 'Could not generate slug'});
        });
    },

    // #### Edit
    // **takes:** a json object with all the properties which should be updated
    edit: function edit(postData) {
        // **returns:** a promise for the resulting post in a json object
        return canThis(this.user).edit.post(postData.id).then(function () {
            return checkPostData(postData).then(function (checkedPostData) {
                return dataProvider.Post.edit(checkedPostData.posts[0]);
            }).then(function (result) {
                if (result) {
                    var omitted = result.toJSON();
                    omitted.author = _.omit(omitted.author, filteredUserAttributes);
                    return { posts: [ omitted ]};
                }
                return when.reject({code: 404, message: 'Post not found'});
            });
        }, function () {
            return when.reject({code: 403, message: 'You do not have permission to edit this post.'});
        });
    },

    // #### Add
    // **takes:** a json object representing a post,
    add: function add(postData) {
        // **returns:** a promise for the resulting post in a json object
        return canThis(this.user).create.post().then(function () {
            return checkPostData(postData).then(function (checkedPostData) {
                return dataProvider.Post.add(checkedPostData.posts[0]);
            }).then(function (result) {
                var omitted = result.toJSON();
                omitted.author = _.omit(omitted.author, filteredUserAttributes);
                return { posts: [ omitted ]};
            });
        }, function () {
            return when.reject({code: 403, message: 'You do not have permission to add posts.'});
        });
    },

    // #### Destroy
    // **takes:** an identifier (id or slug?)
    destroy: function destroy(args) {
        // **returns:** a promise for a json response with the id of the deleted post
        return canThis(this.user).remove.post(args.id).then(function () {
            return posts.read({id : args.id, status: 'all'}).then(function (result) {
                return dataProvider.Post.destroy(args.id).then(function () {
                    var deletedObj = result;
                    return deletedObj;
                });
            });
        }, function () {
            return when.reject({code: 403, message: 'You do not have permission to remove posts.'});
        });
    }
};

module.exports = posts;