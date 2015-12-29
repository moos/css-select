var CSSselect = require(".."),
    makeDom = require("htmlparser2").parseDOM,
    bools = require("boolbase"),
    assert = require("assert");

var dom = makeDom("<div id=foo><p>foo</p></div>")[0],
    xmlDom = makeDom("<DiV id=foo><P>foo</P></DiV>", {xmlMode: true})[0];

describe("API", function(){
	describe("removes duplicates", function(){
		it("between identical trees", function(){
			var matches = CSSselect.selectAll("div", [dom, dom]);
			assert.equal(matches.length, 1, "Removes duplicate matches");
		});
		it("between a superset and subset", function(){
			var matches = CSSselect.selectAll("p", [dom, dom.children[0]]);
			assert.equal(matches.length, 1, "Removes duplicate matches");
		});
		it("betweeen a subset and superset", function(){
			var matches = CSSselect.selectAll("p", [dom.children[0], dom]);
			assert.equal(matches.length, 1, "Removes duplicate matches");
		});
	});

	describe("can be queried by function", function(){
		it("in `is`", function(){
			assert(CSSselect.is(dom, function(elem){
				return elem.attribs.id === "foo";
			}));
		});
		//probably more cases should be added here
	});

	describe("selectAll", function(){
		it("should query array elements directly when they have no parents", function() {
			var divs = [dom];
			assert.deepEqual(CSSselect("div", divs), divs);
		});
		it("should query array elements directly when they have parents", function() {
			var ps = CSSselect("p", [dom]);
			assert.deepEqual(CSSselect("p", ps), ps);
		});
	});

	describe("unsatisfiable and universally valid selectors", function(){
		it("in :not", function(){
			var func = CSSselect._compileUnsafe(":not(*)");
			assert.equal(func, bools.falseFunc);
			func = CSSselect._compileUnsafe(":not(:nth-child(-1n-1))");
			assert.equal(func, bools.trueFunc);
			func = CSSselect._compileUnsafe(":not(:not(:not(*)))");
			assert.equal(func, bools.falseFunc);
		});

		it("in :has", function(){
			var matches = CSSselect.selectAll(":has(*)", [dom]);
			assert.equal(matches.length, 1);
			assert.equal(matches[0], dom);
			var func = CSSselect._compileUnsafe(":has(:nth-child(-1n-1))");
			assert.equal(func, bools.falseFunc);
		});

		it("should skip unsatisfiable", function(){
			var func = CSSselect._compileUnsafe("* :not(*) foo");
			assert.equal(func, bools.falseFunc);
		});

		it("should promote universally valid", function(){
			var func = CSSselect._compileUnsafe("*, foo");
			assert.equal(func, bools.trueFunc);
		});
	});

	describe(":matches", function(){
		it("should select multiple elements", function(){
			var matches = CSSselect.selectAll(":matches(p, div)", [dom]);
			assert.equal(matches.length, 2);
			matches = CSSselect.selectAll(":matches(div, :not(div))", [dom]);
			assert.equal(matches.length, 2);
			matches = CSSselect.selectAll(":matches(boo, baa, tag, div, foo, bar, baz)", [dom]);
			assert.equal(matches.length, 1);
			assert.equal(matches[0], dom);
		});

		it("should strip quotes", function(){
			var matches = CSSselect.selectAll(":matches('p, div')", [dom]);
			assert.equal(matches.length, 2);
			matches = CSSselect.selectAll(":matches(\"p, div\")", [dom]);
			assert.equal(matches.length, 2);
		});
	});

	describe("parent selector (<)", function(){
		it("should select the right element", function(){
			var matches = CSSselect.selectAll("p < div", [dom]);
			assert.equal(matches.length, 1);
			assert.equal(matches[0], dom);
		});
		it("should not select nodes without children", function(){
			var matches = CSSselect.selectAll("p < div", [dom]);
			assert.deepEqual(matches, CSSselect.selectAll("* < *", [dom]));
		});
	});

	describe("selectOne", function(){
		it("should select elements in traversal order", function(){
			var match = CSSselect.selectOne("p", [dom]);
			assert.equal(match, dom.children[0]);
			match = CSSselect.selectOne(":contains(foo)", [dom]);
			assert.equal(match, dom);
		});
		it("should take shortcuts when applicable", function(){
			//TODO this is currently only visible in coverage reports
			var match = CSSselect.selectOne(bools.falseFunc, [dom]);
			assert.equal(match, null);
			match = CSSselect.selectOne("*", []);
			assert.equal(match, null);
		});
	});

	describe("options", function(){
		var opts = {xmlMode: true};
		it("should recognize xmlMode in :has and :not", function(){
			assert(CSSselect.is(xmlDom, "DiV:has(P)",   opts));
			assert(CSSselect.is(xmlDom, "DiV:not(div)", opts));
			assert(CSSselect.is(xmlDom.children[0], "DiV:has(P) :not(p)", opts));
		});

		it("should be strict", function(){
			var opts = {strict: true};
			assert.throws(CSSselect.compile.bind(null, ":checkbox", opts), SyntaxError);
			assert.throws(CSSselect.compile.bind(null, "[attr=val i]", opts), SyntaxError);
			assert.throws(CSSselect.compile.bind(null, "[attr!=val]", opts), SyntaxError);
			assert.throws(CSSselect.compile.bind(null, "[attr!=val i]", opts), SyntaxError);
			assert.throws(CSSselect.compile.bind(null, "foo < bar", opts), SyntaxError);
			assert.throws(CSSselect.compile.bind(null, ":not(:parent)", opts), SyntaxError);
			assert.throws(CSSselect.compile.bind(null, ":not(a > b)", opts), SyntaxError);
			assert.throws(CSSselect.compile.bind(null, ":not(a, b)",  opts), SyntaxError);
		});

		it("should recognize contexts", function(){
			var div = CSSselect("div", [dom]),
			    p = CSSselect("p", [dom]);

			assert.equal(CSSselect.selectOne("div", div, {context: div}), div[0]);
			assert.equal(CSSselect.selectOne("div", div, {context: p}), null);
			assert.deepEqual(CSSselect.selectAll("p", div, {context: div}), p);
		});
	});


  describe("selectorIndex", function(){
    it("should match selectAll", function(){
      var matches = CSSselect("div,p", [dom]);
      assert.equal(matches.length, 2);
      assert.equal(matches[0].selectorIndex, 0);
      assert.equal(matches[1].selectorIndex, 1);
    });

    it("should match selectOne", function(){
      var matches = CSSselect.selectOne("p,div", [dom]);
      assert.equal(matches.name, 'div');
      assert.equal(matches.selectorIndex, 1);
    });
  });

});
