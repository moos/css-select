var DomUtils    = require("domutils"),
    isTag       = DomUtils.isTag,
    getParent   = DomUtils.getParent,
    getChildren = DomUtils.getChildren,
    getSiblings = DomUtils.getSiblings,
    getName     = DomUtils.getName,
    BaseFuncs   = require("boolbase"),
    trueFunc    = BaseFuncs.trueFunc,
    falseFunc   = BaseFuncs.falseFunc;

/*
	all available rules
*/
var Rules = module.exports = {
	__proto__: null,

	attribute: require("./attributes.js").compile,
	pseudo: require("./pseudos.js").compile,

  //special: lastRule -- runs the last rule and checks result
  lastRule: function(next, rule, options, context, tokenIndex){
    var func = Rules[rule.type](next, rule, options, context);
    if (func === falseFunc || func === trueFunc) return func;

    return function(elem) {
      // interject code -- check result before returning
      var result = func(elem);
      if (result) {
        elem.selectorIndex = tokenIndex;
      }
      else delete elem.selectorIndex;
      return result;
    };
  },

  //tags
	tag: function(next, data){
		var name = data.name;
		return function tag(elem){
			return getName(elem) === name && next(elem);
		};
	},

	//traversal
	descendant: function(next){
		return function descendant(elem){

			var found = false;

			while(!found && (elem = getParent(elem))){
				found = next(elem);
			}

			return found;
		};
	},
	_flexibleDescendant: function(next){
		// Include element itself, only used while querying an array
		return function descendant(elem){

			var found = next(elem);

			while(!found && (elem = getParent(elem))){
				found = next(elem);
			}

			return found;
		};
	},
	parent: function(next, data, options){
		if(options && options.strict) throw SyntaxError("Parent selector isn't part of CSS3");

		return function parent(elem){
			return getChildren(elem).some(test);
		};

		function test(elem){
			return isTag(elem) && next(elem);
		}
	},
	child: function(next){
		return function child(elem){
			var parent = getParent(elem);
			return !!parent && next(parent);
		};
	},
	sibling: function(next){
		return function sibling(elem){
			var siblings = getSiblings(elem);

			for(var i = 0; i < siblings.length; i++){
				if(isTag(siblings[i])){
					if(siblings[i] === elem) break;
					if(next(siblings[i])) return true;
				}
			}

			return false;
		};
	},
	adjacent: function(next){
		return function adjacent(elem){
			var siblings = getSiblings(elem),
			    lastElement;

			for(var i = 0; i < siblings.length; i++){
				if(isTag(siblings[i])){
					if(siblings[i] === elem) break;
					lastElement = siblings[i];
				}
			}

			return !!lastElement && next(lastElement);
		};
	},
	universal: function(next){
		return next;
	}
};