"use strict";

function Data(options) {

	var fs = require('fs');
	var marked = require('marked');
	var months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

	this.initialize = function(options) {
		if(typeof options !== 'object') {
			options = {};
		}

		if(typeof options.postsSort !== 'undefined') {
			options.postsSort = options.postsSort !== 'asc' ? 'desc' : 'asc';
		} else {
			options.postsSort = 'desc'; // by default
		}

		if(typeof options.overviewLength !== 'undefined') {
			options.overviewLength = parseInt(options.overviewLength, 10);
		} else {
			options.overviewLength = 200; // by default
		}

		if(typeof options.removeUpdateBlocks !== 'undefined') {
			options.removeUpdateBlocks = !!options.removeUpdateBlocks;
		} else {
			options.removeUpdateBlocks = false; // by default
		}

		var markdownPosts = this.getMarkdownFiles('posts'),
			i, category, categories = [], tags = [], metadata, posts = [], post, dates, date, tag, years = [];

		for(i = 0; i < markdownPosts.length; i++) {

			metadata = this.getMetadata(markdownPosts[i]);

			post = {
				source: {
					markdown: markdownPosts[i],
					html: this.htmlize(markdownPosts[i]),
				},
				overview: '',
				metadata: metadata,
				date: {},
				tags: [],
				category: {},
			};

			post.overview = this.getOverview(post, options.overviewLength, options.removeUpdateBlocks);

			// post's date
			if(typeof metadata.date !== 'undefined') {
				dates = metadata.date.split('-');
				date = new Date(dates[0], parseInt(dates[1], 10) - 1, dates[2]);

				post.date = {
					object: new Date(date.getTime() - date.getTimezoneOffset() * 60000),
					month: months[date.getMonth()],
					year: date.getFullYear(),
					iso: date.toISOString()
				};

				years.push({
					lower: this.toLower(post.date.year),
					raw: post.date.year,
					css: this.toCss(post.date.year),
					url: this.toUrl(post.date.year),
				});
			}

			// post's tags
			if(typeof metadata.tags !== 'undefined') {
				for(var j = 0; j < metadata.tags.length; j++) {
					tag = {
						lower: this.toLower(metadata.tags[j]),
						raw: metadata.tags[j],
						css: this.toCss(metadata.tags[j]),
						url: this.toUrl(metadata.tags[j]),
					};
					post.tags.push(tag);
					tags.push(tag); // overall tags
				}
			}

			// post's category
			if(typeof metadata.category !== 'undefined') {
				post.category = {
					lower: this.toLower(metadata.category),
					raw: metadata.category,
					css: this.toCss(metadata.category),
					url: this.toUrl(metadata.category),
				};

				// overall categories
				categories.push(post.category);
			}

			// title and url
			if(typeof metadata.title !== 'title') {
				post.title = metadata.title;
				post.url = this.toUrl(metadata.title);
			}

			// add post to array
			posts.push(post);
		}

		// sort posts
		posts.sort(function(post1, post2) {
			if(post1.date.object.getTime() < post2.date.object.getTime()) {
				return options.postsSort === 'asc' ? -1 : 1;
			} else {
				return options.postsSort === 'asc' ? 1 : -1;
			}
		});

		// pages
		var markdownPages = this.getMarkdownFiles('pages'), pages = [], page;
		for(i = 0; i < markdownPages.length; i++) {
			metadata = this.getMetadata(markdownPages[i]);

			page = {
				source: {
					markdown: markdownPages[i],
					html: this.htmlize(markdownPages[i]),
				},
				metadata: metadata
			};

			// title and url
			if(typeof metadata.title !== 'title') {
				page.title = metadata.title;
				page.url = this.toUrl(metadata.title);
			}

			pages.push(page);
		}

		return {
			tags: this.distinctValues(tags),
			categories: this.distinctValues(categories),
			years: this.distinctValues(years),
			posts: posts,
			pages: pages
		};
	};

	this.getMarkdownFiles = function(path) {
		var list = [];

		if(fs.existsSync(path)) {
			var files = fs.readdirSync(path),
				i, stat, file, output, markdown;

			for(i = 0; i < files.length; i++) {
				file = path + '/' + files[i];
				stat = fs.statSync(file);

				if(stat.isFile() && files[i].substr(-3) === '.md') {
					markdown = fs.readFileSync(file, 'utf8');
					list.push(markdown);
				}
			}
		}

		return list;
	};

	this.htmlize = function(markdown) {
		return marked(markdown);
	};

	this.getMetadata = function(markdown) {
		var tokens = marked.lexer(markdown),
			metaRegex = /([a-zA-Z_]+): (.+)/g,
			metadata = [], metaResult, tags, i;

		if(typeof tokens[0] !== 'undefined' && tokens[0].type === 'html') {
			while((metaResult = metaRegex.exec(tokens[0].text)) !== null) {
				if(metaResult.length === 3) {

					if(metaResult[1] === 'tags') {
						tags = metaResult[2].split(',');
						for(i = 0; i < tags.length; i++) {
							tags[i] = tags[i].trim();
						}
						metadata[metaResult[1]] = tags;
					} else {
						metadata[metaResult[1]] = metaResult[2].trim();
					}
				} else {
					throw new Error('Problem with meta: ' + metaResult[0]);
				}
			}
		}

		return metadata;
	};

	this.getOverview = function(post, length, removeUpdateBlocks) {
		var source = post.source.html;

		// remove class="updates"
		removeUpdateBlocks = removeUpdateBlocks || false;
		if(removeUpdateBlocks) {
			var regex = /<div class="updates">(.*)<\/div>/g;
			source = source.replace(regex, '');
		}

		var overview = this.stripHtml(source);

		if(overview.length > length) {
			while(overview.charAt(length) !== ' ') {
				length += (overview.charAt(length).match(/[^\w]+/g) !== null ? 2 : 1);
			}
		} else {
			length = overview.length;
		}

		return overview.substr(0, length);
	};

	/**
	UTILS
	**/

	this.distinctValues = function(values) {
		var distinctValues = [], lowerValues = [], lowerValue,
			i;

		for(i = 0; i < values.length; i++) {
			lowerValue = values[i].lower;
			if(lowerValues.indexOf(lowerValue) === -1) {
				distinctValues.push(values[i]);
				lowerValues.push(lowerValue);
			}
		}

		return distinctValues;
	};

	this.stripHtml = function(value) {
		return (value + '').replace(/(<([^>]+)>)/ig, '');
	}

	this.toLower = function(value) {
		return (value + '').toLowerCase();
	};

	this.toCss = function(value) {
		return (value + '').toLowerCase().replace(/([^\w]+)/g, ' ').trim().replace(/ /g, '-');
	};

	this.toUrl = function(value) {
		return (value + '').toLowerCase().replace(/([^\w]+)/g, ' ').trim().replace(/ /g, '-');
	};

	return this.initialize(options);
}

module.exports = Data;