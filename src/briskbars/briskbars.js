// briskbars 1.1.0
var __defProp = Object.defineProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};

// node_modules/@handlebars/parser/dist/esm/exception.js
var errorProps = [
  "description",
  "fileName",
  "lineNumber",
  "endLineNumber",
  "message",
  "name",
  "number",
  "stack"
];
function Exception(message, node) {
  var loc = node && node.loc, line, endLineNumber, column, endColumn;
  if (loc) {
    line = loc.start.line;
    endLineNumber = loc.end.line;
    column = loc.start.column;
    endColumn = loc.end.column;
    message += " - " + line + ":" + column;
  }
  var tmp = Error.prototype.constructor.call(this, message);
  for (var idx = 0; idx < errorProps.length; idx++) {
    this[errorProps[idx]] = tmp[errorProps[idx]];
  }
  if (Error.captureStackTrace) {
    Error.captureStackTrace(this, Exception);
  }
  try {
    if (loc) {
      this.lineNumber = line;
      this.endLineNumber = endLineNumber;
      if (Object.defineProperty) {
        Object.defineProperty(this, "column", {
          value: column,
          enumerable: true
        });
        Object.defineProperty(this, "endColumn", {
          value: endColumn,
          enumerable: true
        });
      } else {
        this.column = column;
        this.endColumn = endColumn;
      }
    }
  } catch (nop) {
  }
}
Exception.prototype = new Error();
var exception_default = Exception;

// node_modules/@handlebars/parser/dist/esm/visitor.js
function Visitor() {
  this.parents = [];
}
Visitor.prototype = {
  constructor: Visitor,
  mutating: false,
  // Visits a given value. If mutating, will replace the value if necessary.
  acceptKey: function(node, name) {
    var value = this.accept(node[name]);
    if (this.mutating) {
      if (value && !Visitor.prototype[value.type]) {
        throw new exception_default('Unexpected node type "' + value.type + '" found when accepting ' + name + " on " + node.type);
      }
      node[name] = value;
    }
  },
  // Performs an accept operation with added sanity check to ensure
  // required keys are not removed.
  acceptRequired: function(node, name) {
    this.acceptKey(node, name);
    if (!node[name]) {
      throw new exception_default(node.type + " requires " + name);
    }
  },
  // Traverses a given array. If mutating, empty responses will be removed
  // for child elements.
  acceptArray: function(array) {
    for (var i = 0, l = array.length; i < l; i++) {
      this.acceptKey(array, i);
      if (!array[i]) {
        array.splice(i, 1);
        i--;
        l--;
      }
    }
  },
  accept: function(object) {
    if (!object) {
      return;
    }
    if (!this[object.type]) {
      throw new exception_default("Unknown type: " + object.type, object);
    }
    if (this.current) {
      this.parents.unshift(this.current);
    }
    this.current = object;
    var ret = this[object.type](object);
    this.current = this.parents.shift();
    if (!this.mutating || ret) {
      return ret;
    } else if (ret !== false) {
      return object;
    }
  },
  Program: function(program) {
    this.acceptArray(program.body);
  },
  MustacheStatement: visitSubExpression,
  Decorator: visitSubExpression,
  BlockStatement: visitBlock,
  DecoratorBlock: visitBlock,
  PartialStatement: visitPartial,
  PartialBlockStatement: function(partial) {
    visitPartial.call(this, partial);
    this.acceptKey(partial, "program");
  },
  ContentStatement: function() {
  },
  CommentStatement: function() {
  },
  SubExpression: visitSubExpression,
  PathExpression: function() {
  },
  StringLiteral: function() {
  },
  NumberLiteral: function() {
  },
  BooleanLiteral: function() {
  },
  UndefinedLiteral: function() {
  },
  NullLiteral: function() {
  },
  Hash: function(hash) {
    this.acceptArray(hash.pairs);
  },
  HashPair: function(pair) {
    this.acceptRequired(pair, "value");
  }
};
function visitSubExpression(mustache) {
  this.acceptRequired(mustache, "path");
  this.acceptArray(mustache.params);
  this.acceptKey(mustache, "hash");
}
function visitBlock(block) {
  visitSubExpression.call(this, block);
  this.acceptKey(block, "program");
  this.acceptKey(block, "inverse");
}
function visitPartial(partial) {
  this.acceptRequired(partial, "name");
  this.acceptArray(partial.params);
  this.acceptKey(partial, "hash");
}
var visitor_default = Visitor;

// node_modules/@handlebars/parser/dist/esm/whitespace-control.js
function WhitespaceControl(options) {
  if (options === void 0) {
    options = {};
  }
  this.options = options;
}
WhitespaceControl.prototype = new visitor_default();
WhitespaceControl.prototype.Program = function(program) {
  var doStandalone = !this.options.ignoreStandalone;
  var isRoot = !this.isRootSeen;
  this.isRootSeen = true;
  var body = program.body;
  for (var i = 0, l = body.length; i < l; i++) {
    var current = body[i], strip = this.accept(current);
    if (!strip) {
      continue;
    }
    var _isPrevWhitespace = isPrevWhitespace(body, i, isRoot), _isNextWhitespace = isNextWhitespace(body, i, isRoot), openStandalone = strip.openStandalone && _isPrevWhitespace, closeStandalone = strip.closeStandalone && _isNextWhitespace, inlineStandalone = strip.inlineStandalone && _isPrevWhitespace && _isNextWhitespace;
    if (strip.close) {
      omitRight(body, i, true);
    }
    if (strip.open) {
      omitLeft(body, i, true);
    }
    if (doStandalone && inlineStandalone) {
      omitRight(body, i);
      if (omitLeft(body, i)) {
        if (current.type === "PartialStatement") {
          current.indent = /([ \t]+$)/.exec(body[i - 1].original)[1];
        }
      }
    }
    if (doStandalone && openStandalone) {
      omitRight((current.program || current.inverse).body);
      omitLeft(body, i);
    }
    if (doStandalone && closeStandalone) {
      omitRight(body, i);
      omitLeft((current.inverse || current.program).body);
    }
  }
  return program;
};
WhitespaceControl.prototype.BlockStatement = WhitespaceControl.prototype.DecoratorBlock = WhitespaceControl.prototype.PartialBlockStatement = function(block) {
  this.accept(block.program);
  this.accept(block.inverse);
  var program = block.program || block.inverse, inverse = block.program && block.inverse, firstInverse = inverse, lastInverse = inverse;
  if (inverse && inverse.chained) {
    firstInverse = inverse.body[0].program;
    while (lastInverse.chained) {
      lastInverse = lastInverse.body[lastInverse.body.length - 1].program;
    }
  }
  var strip = {
    open: block.openStrip.open,
    close: block.closeStrip.close,
    // Determine the standalone candidacy. Basically flag our content as being possibly standalone
    // so our parent can determine if we actually are standalone
    openStandalone: isNextWhitespace(program.body),
    closeStandalone: isPrevWhitespace((firstInverse || program).body)
  };
  if (block.openStrip.close) {
    omitRight(program.body, null, true);
  }
  if (inverse) {
    var inverseStrip = block.inverseStrip;
    if (inverseStrip.open) {
      omitLeft(program.body, null, true);
    }
    if (inverseStrip.close) {
      omitRight(firstInverse.body, null, true);
    }
    if (block.closeStrip.open) {
      omitLeft(lastInverse.body, null, true);
    }
    if (!this.options.ignoreStandalone && isPrevWhitespace(program.body) && isNextWhitespace(firstInverse.body)) {
      omitLeft(program.body);
      omitRight(firstInverse.body);
    }
  } else if (block.closeStrip.open) {
    omitLeft(program.body, null, true);
  }
  return strip;
};
WhitespaceControl.prototype.Decorator = WhitespaceControl.prototype.MustacheStatement = function(mustache) {
  return mustache.strip;
};
WhitespaceControl.prototype.PartialStatement = WhitespaceControl.prototype.CommentStatement = function(node) {
  var strip = node.strip || {};
  return {
    inlineStandalone: true,
    open: strip.open,
    close: strip.close
  };
};
function isPrevWhitespace(body, i, isRoot) {
  if (i === void 0) {
    i = body.length;
  }
  var prev = body[i - 1], sibling = body[i - 2];
  if (!prev) {
    return isRoot;
  }
  if (prev.type === "ContentStatement") {
    return (sibling || !isRoot ? /\r?\n\s*?$/ : /(^|\r?\n)\s*?$/).test(prev.original);
  }
}
function isNextWhitespace(body, i, isRoot) {
  if (i === void 0) {
    i = -1;
  }
  var next = body[i + 1], sibling = body[i + 2];
  if (!next) {
    return isRoot;
  }
  if (next.type === "ContentStatement") {
    return (sibling || !isRoot ? /^\s*?\r?\n/ : /^\s*?(\r?\n|$)/).test(next.original);
  }
}
function omitRight(body, i, multiple) {
  var current = body[i == null ? 0 : i + 1];
  if (!current || current.type !== "ContentStatement" || !multiple && current.rightStripped) {
    return;
  }
  var original = current.value;
  current.value = current.value.replace(multiple ? /^\s+/ : /^[ \t]*\r?\n?/, "");
  current.rightStripped = current.value !== original;
}
function omitLeft(body, i, multiple) {
  var current = body[i == null ? body.length - 1 : i - 1];
  if (!current || current.type !== "ContentStatement" || !multiple && current.leftStripped) {
    return;
  }
  var original = current.value;
  current.value = current.value.replace(multiple ? /\s+$/ : /[ \t]+$/, "");
  current.leftStripped = current.value !== original;
  return current.leftStripped;
}
var whitespace_control_default = WhitespaceControl;

// node_modules/@handlebars/parser/dist/esm/parser.js
var parser = (function() {
  var o = function(k, v, o2, l) {
    for (o2 = o2 || {}, l = k.length; l--; o2[k[l]] = v)
      ;
    return o2;
  }, $V0 = [2, 52], $V1 = [1, 20], $V2 = [5, 14, 15, 19, 29, 34, 39, 44, 47, 48, 53, 57, 61], $V3 = [1, 44], $V4 = [1, 40], $V5 = [1, 43], $V6 = [1, 33], $V7 = [1, 34], $V8 = [1, 35], $V9 = [1, 36], $Va = [1, 37], $Vb = [1, 42], $Vc = [1, 46], $Vd = [14, 15, 19, 29, 34, 39, 44, 47, 48, 53, 57, 61], $Ve = [14, 15, 19, 29, 34, 44, 47, 48, 53, 57, 61], $Vf = [15, 18], $Vg = [14, 15, 19, 29, 34, 47, 48, 53, 57, 61], $Vh = [33, 67, 73, 75, 84, 85, 86, 87, 88, 89], $Vi = [23, 33, 56, 67, 68, 73, 75, 77, 79, 84, 85, 86, 87, 88, 89], $Vj = [1, 62], $Vk = [1, 63], $Vl = [23, 33, 56, 68, 73, 79], $Vm = [23, 33, 56, 67, 68, 73, 75, 77, 79, 84, 85, 86, 87, 88, 89, 92, 93], $Vn = [2, 51], $Vo = [1, 64], $Vp = [67, 73, 75, 77, 84, 85, 86, 87, 88, 89], $Vq = [56, 67, 73, 75, 84, 85, 86, 87, 88, 89], $Vr = [1, 75], $Vs = [1, 76], $Vt = [1, 83], $Vu = [33, 67, 73, 75, 79, 84, 85, 86, 87, 88, 89], $Vv = [23, 67, 73, 75, 84, 85, 86, 87, 88, 89], $Vw = [67, 68, 73, 75, 84, 85, 86, 87, 88, 89], $Vx = [33, 79], $Vy = [1, 134], $Vz = [73, 81];
  var parser2 = {
    trace: function trace() {
    },
    yy: {},
    symbols_: { "error": 2, "root": 3, "program": 4, "EOF": 5, "program_repetition0": 6, "statement": 7, "mustache": 8, "block": 9, "rawBlock": 10, "partial": 11, "partialBlock": 12, "content": 13, "COMMENT": 14, "CONTENT": 15, "openRawBlock": 16, "rawBlock_repetition0": 17, "END_RAW_BLOCK": 18, "OPEN_RAW_BLOCK": 19, "helperName": 20, "openRawBlock_repetition0": 21, "openRawBlock_option0": 22, "CLOSE_RAW_BLOCK": 23, "openBlock": 24, "block_option0": 25, "closeBlock": 26, "openInverse": 27, "block_option1": 28, "OPEN_BLOCK": 29, "openBlock_repetition0": 30, "openBlock_option0": 31, "openBlock_option1": 32, "CLOSE": 33, "OPEN_INVERSE": 34, "openInverse_repetition0": 35, "openInverse_option0": 36, "openInverse_option1": 37, "openInverseChain": 38, "OPEN_INVERSE_CHAIN": 39, "openInverseChain_repetition0": 40, "openInverseChain_option0": 41, "openInverseChain_option1": 42, "inverseAndProgram": 43, "INVERSE": 44, "inverseChain": 45, "inverseChain_option0": 46, "OPEN_ENDBLOCK": 47, "OPEN": 48, "hash": 49, "expr": 50, "mustache_repetition0": 51, "mustache_option0": 52, "OPEN_UNESCAPED": 53, "mustache_repetition1": 54, "mustache_option1": 55, "CLOSE_UNESCAPED": 56, "OPEN_PARTIAL": 57, "partial_repetition0": 58, "partial_option0": 59, "openPartialBlock": 60, "OPEN_PARTIAL_BLOCK": 61, "openPartialBlock_repetition0": 62, "openPartialBlock_option0": 63, "exprHead": 64, "arrayLiteral": 65, "sexpr": 66, "OPEN_SEXPR": 67, "CLOSE_SEXPR": 68, "sexpr_repetition0": 69, "sexpr_option0": 70, "hash_repetition_plus0": 71, "hashSegment": 72, "ID": 73, "EQUALS": 74, "OPEN_ARRAY": 75, "arrayLiteral_repetition0": 76, "CLOSE_ARRAY": 77, "blockParams": 78, "OPEN_BLOCK_PARAMS": 79, "blockParams_repetition_plus0": 80, "CLOSE_BLOCK_PARAMS": 81, "path": 82, "dataName": 83, "STRING": 84, "NUMBER": 85, "BOOLEAN": 86, "UNDEFINED": 87, "NULL": 88, "DATA": 89, "pathSegments": 90, "sep": 91, "SEP": 92, "PRIVATE_SEP": 93, "$accept": 0, "$end": 1 },
    terminals_: { 2: "error", 5: "EOF", 14: "COMMENT", 15: "CONTENT", 18: "END_RAW_BLOCK", 19: "OPEN_RAW_BLOCK", 23: "CLOSE_RAW_BLOCK", 29: "OPEN_BLOCK", 33: "CLOSE", 34: "OPEN_INVERSE", 39: "OPEN_INVERSE_CHAIN", 44: "INVERSE", 47: "OPEN_ENDBLOCK", 48: "OPEN", 53: "OPEN_UNESCAPED", 56: "CLOSE_UNESCAPED", 57: "OPEN_PARTIAL", 61: "OPEN_PARTIAL_BLOCK", 67: "OPEN_SEXPR", 68: "CLOSE_SEXPR", 73: "ID", 74: "EQUALS", 75: "OPEN_ARRAY", 77: "CLOSE_ARRAY", 79: "OPEN_BLOCK_PARAMS", 81: "CLOSE_BLOCK_PARAMS", 84: "STRING", 85: "NUMBER", 86: "BOOLEAN", 87: "UNDEFINED", 88: "NULL", 89: "DATA", 92: "SEP", 93: "PRIVATE_SEP" },
    productions_: [0, [3, 2], [4, 1], [7, 1], [7, 1], [7, 1], [7, 1], [7, 1], [7, 1], [7, 1], [13, 1], [10, 3], [16, 5], [9, 4], [9, 4], [24, 6], [27, 6], [38, 6], [43, 2], [45, 3], [45, 1], [26, 3], [8, 3], [8, 5], [8, 5], [11, 5], [12, 3], [60, 5], [50, 1], [50, 1], [64, 1], [64, 1], [66, 3], [66, 5], [49, 1], [72, 3], [65, 3], [78, 3], [20, 1], [20, 1], [20, 1], [20, 1], [20, 1], [20, 1], [20, 1], [83, 2], [91, 1], [91, 1], [82, 3], [82, 1], [90, 3], [90, 1], [6, 0], [6, 2], [17, 0], [17, 2], [21, 0], [21, 2], [22, 0], [22, 1], [25, 0], [25, 1], [28, 0], [28, 1], [30, 0], [30, 2], [31, 0], [31, 1], [32, 0], [32, 1], [35, 0], [35, 2], [36, 0], [36, 1], [37, 0], [37, 1], [40, 0], [40, 2], [41, 0], [41, 1], [42, 0], [42, 1], [46, 0], [46, 1], [51, 0], [51, 2], [52, 0], [52, 1], [54, 0], [54, 2], [55, 0], [55, 1], [58, 0], [58, 2], [59, 0], [59, 1], [62, 0], [62, 2], [63, 0], [63, 1], [69, 0], [69, 2], [70, 0], [70, 1], [71, 1], [71, 2], [76, 0], [76, 2], [80, 1], [80, 2]],
    performAction: function anonymous(yytext, yyleng, yylineno, yy, yystate, $$, _$) {
      var $0 = $$.length - 1;
      switch (yystate) {
        case 1:
          return $$[$0 - 1];
          break;
        case 2:
          this.$ = yy.prepareProgram($$[$0]);
          break;
        case 3:
        case 4:
        case 5:
        case 6:
        case 7:
        case 8:
        case 20:
        case 28:
        case 29:
        case 30:
        case 31:
        case 38:
        case 39:
        case 46:
        case 47:
          this.$ = $$[$0];
          break;
        case 9:
          this.$ = {
            type: "CommentStatement",
            value: yy.stripComment($$[$0]),
            strip: yy.stripFlags($$[$0], $$[$0]),
            loc: yy.locInfo(this._$)
          };
          break;
        case 10:
          this.$ = {
            type: "ContentStatement",
            original: $$[$0],
            value: $$[$0],
            loc: yy.locInfo(this._$)
          };
          break;
        case 11:
          this.$ = yy.prepareRawBlock($$[$0 - 2], $$[$0 - 1], $$[$0], this._$);
          break;
        case 12:
          this.$ = { path: $$[$0 - 3], params: $$[$0 - 2], hash: $$[$0 - 1] };
          break;
        case 13:
          this.$ = yy.prepareBlock($$[$0 - 3], $$[$0 - 2], $$[$0 - 1], $$[$0], false, this._$);
          break;
        case 14:
          this.$ = yy.prepareBlock($$[$0 - 3], $$[$0 - 2], $$[$0 - 1], $$[$0], true, this._$);
          break;
        case 15:
          this.$ = { open: $$[$0 - 5], path: $$[$0 - 4], params: $$[$0 - 3], hash: $$[$0 - 2], blockParams: $$[$0 - 1], strip: yy.stripFlags($$[$0 - 5], $$[$0]) };
          break;
        case 16:
        case 17:
          this.$ = { path: $$[$0 - 4], params: $$[$0 - 3], hash: $$[$0 - 2], blockParams: $$[$0 - 1], strip: yy.stripFlags($$[$0 - 5], $$[$0]) };
          break;
        case 18:
          this.$ = { strip: yy.stripFlags($$[$0 - 1], $$[$0 - 1]), program: $$[$0] };
          break;
        case 19:
          var inverse = yy.prepareBlock($$[$0 - 2], $$[$0 - 1], $$[$0], $$[$0], false, this._$), program = yy.prepareProgram([inverse], $$[$0 - 1].loc);
          program.chained = true;
          this.$ = { strip: $$[$0 - 2].strip, program, chain: true };
          break;
        case 21:
          this.$ = { path: $$[$0 - 1], strip: yy.stripFlags($$[$0 - 2], $$[$0]) };
          break;
        case 22:
          this.$ = yy.prepareMustache(yy.syntax.hash($$[$0 - 1], yy.locInfo(this._$), { yy, syntax: "expr" }), [], void 0, $$[$0 - 2], yy.stripFlags($$[$0 - 2], $$[$0]), this._$);
          break;
        case 23:
        case 24:
          this.$ = yy.prepareMustache($$[$0 - 3], $$[$0 - 2], $$[$0 - 1], $$[$0 - 4], yy.stripFlags($$[$0 - 4], $$[$0]), this._$);
          break;
        case 25:
          this.$ = {
            type: "PartialStatement",
            name: $$[$0 - 3],
            params: $$[$0 - 2],
            hash: $$[$0 - 1],
            indent: "",
            strip: yy.stripFlags($$[$0 - 4], $$[$0]),
            loc: yy.locInfo(this._$)
          };
          break;
        case 26:
          this.$ = yy.preparePartialBlock($$[$0 - 2], $$[$0 - 1], $$[$0], this._$);
          break;
        case 27:
          this.$ = { path: $$[$0 - 3], params: $$[$0 - 2], hash: $$[$0 - 1], strip: yy.stripFlags($$[$0 - 4], $$[$0]) };
          break;
        case 32:
          this.$ = yy.syntax.hash($$[$0 - 1], yy.locInfo(this._$), { yy, syntax: "expr" });
          break;
        case 33:
          this.$ = {
            type: "SubExpression",
            path: $$[$0 - 3],
            params: $$[$0 - 2],
            hash: $$[$0 - 1],
            loc: yy.locInfo(this._$)
          };
          break;
        case 34:
          this.$ = { type: "Hash", pairs: $$[$0], loc: yy.locInfo(this._$) };
          break;
        case 35:
          this.$ = { type: "HashPair", key: yy.id($$[$0 - 2]), value: $$[$0], loc: yy.locInfo(this._$) };
          break;
        case 36:
          this.$ = yy.syntax.square($$[$0 - 1], yy.locInfo(this._$), { yy, syntax: "expr" });
          break;
        case 37:
          this.$ = yy.id($$[$0 - 1]);
          break;
        case 40:
          this.$ = { type: "StringLiteral", value: $$[$0], original: $$[$0], loc: yy.locInfo(this._$) };
          break;
        case 41:
          this.$ = { type: "NumberLiteral", value: Number($$[$0]), original: Number($$[$0]), loc: yy.locInfo(this._$) };
          break;
        case 42:
          this.$ = { type: "BooleanLiteral", value: $$[$0] === "true", original: $$[$0] === "true", loc: yy.locInfo(this._$) };
          break;
        case 43:
          this.$ = { type: "UndefinedLiteral", original: void 0, value: void 0, loc: yy.locInfo(this._$) };
          break;
        case 44:
          this.$ = { type: "NullLiteral", original: null, value: null, loc: yy.locInfo(this._$) };
          break;
        case 45:
          this.$ = yy.preparePath(true, false, $$[$0], this._$);
          break;
        case 48:
          this.$ = yy.preparePath(false, $$[$0 - 2], $$[$0], this._$);
          break;
        case 49:
          this.$ = yy.preparePath(false, false, $$[$0], this._$);
          break;
        case 50:
          $$[$0 - 2].push({ part: yy.id($$[$0]), original: $$[$0], separator: $$[$0 - 1] });
          this.$ = $$[$0 - 2];
          break;
        case 51:
          this.$ = [{ part: yy.id($$[$0]), original: $$[$0] }];
          break;
        case 52:
        case 54:
        case 56:
        case 64:
        case 70:
        case 76:
        case 84:
        case 88:
        case 92:
        case 96:
        case 100:
        case 106:
          this.$ = [];
          break;
        case 53:
        case 55:
        case 57:
        case 65:
        case 71:
        case 77:
        case 85:
        case 89:
        case 93:
        case 97:
        case 101:
        case 105:
        case 107:
        case 109:
          $$[$0 - 1].push($$[$0]);
          break;
        case 104:
        case 108:
          this.$ = [$$[$0]];
          break;
      }
    },
    table: [o([5, 14, 15, 19, 29, 34, 48, 53, 57, 61], $V0, { 3: 1, 4: 2, 6: 3 }), { 1: [3] }, { 5: [1, 4] }, o([5, 39, 44, 47], [2, 2], { 7: 5, 8: 6, 9: 7, 10: 8, 11: 9, 12: 10, 13: 11, 24: 15, 27: 16, 16: 17, 60: 19, 14: [1, 12], 15: $V1, 19: [1, 23], 29: [1, 21], 34: [1, 22], 48: [1, 13], 53: [1, 14], 57: [1, 18], 61: [1, 24] }), { 1: [2, 1] }, o($V2, [2, 53]), o($V2, [2, 3]), o($V2, [2, 4]), o($V2, [2, 5]), o($V2, [2, 6]), o($V2, [2, 7]), o($V2, [2, 8]), o($V2, [2, 9]), { 20: 28, 49: 25, 50: 26, 64: 29, 65: 38, 66: 39, 67: $V3, 71: 27, 72: 30, 73: $V4, 75: $V5, 82: 31, 83: 32, 84: $V6, 85: $V7, 86: $V8, 87: $V9, 88: $Va, 89: $Vb, 90: 41 }, { 20: 28, 50: 45, 64: 29, 65: 38, 66: 39, 67: $V3, 73: $Vc, 75: $V5, 82: 31, 83: 32, 84: $V6, 85: $V7, 86: $V8, 87: $V9, 88: $Va, 89: $Vb, 90: 41 }, o($Vd, $V0, { 6: 3, 4: 47 }), o($Ve, $V0, { 6: 3, 4: 48 }), o($Vf, [2, 54], { 17: 49 }), { 20: 28, 50: 50, 64: 29, 65: 38, 66: 39, 67: $V3, 73: $Vc, 75: $V5, 82: 31, 83: 32, 84: $V6, 85: $V7, 86: $V8, 87: $V9, 88: $Va, 89: $Vb, 90: 41 }, o($Vg, $V0, { 6: 3, 4: 51 }), o([5, 14, 15, 18, 19, 29, 34, 39, 44, 47, 48, 53, 57, 61], [2, 10]), { 20: 52, 64: 53, 65: 38, 66: 39, 67: $V3, 73: $Vc, 75: $V5, 82: 31, 83: 32, 84: $V6, 85: $V7, 86: $V8, 87: $V9, 88: $Va, 89: $Vb, 90: 41 }, { 20: 54, 64: 53, 65: 38, 66: 39, 67: $V3, 73: $Vc, 75: $V5, 82: 31, 83: 32, 84: $V6, 85: $V7, 86: $V8, 87: $V9, 88: $Va, 89: $Vb, 90: 41 }, { 20: 55, 64: 53, 65: 38, 66: 39, 67: $V3, 73: $Vc, 75: $V5, 82: 31, 83: 32, 84: $V6, 85: $V7, 86: $V8, 87: $V9, 88: $Va, 89: $Vb, 90: 41 }, { 20: 28, 50: 56, 64: 29, 65: 38, 66: 39, 67: $V3, 73: $Vc, 75: $V5, 82: 31, 83: 32, 84: $V6, 85: $V7, 86: $V8, 87: $V9, 88: $Va, 89: $Vb, 90: 41 }, { 33: [1, 57] }, o($Vh, [2, 84], { 51: 58 }), o([23, 33, 56, 68, 79], [2, 34], { 72: 59, 73: [1, 60] }), o($Vi, [2, 28]), o($Vi, [2, 29], { 91: 61, 92: $Vj, 93: $Vk }), o($Vl, [2, 104]), o($Vi, [2, 38]), o($Vi, [2, 39]), o($Vi, [2, 40]), o($Vi, [2, 41]), o($Vi, [2, 42]), o($Vi, [2, 43]), o($Vi, [2, 44]), o($Vm, [2, 30]), o($Vm, [2, 31]), o([23, 33, 56, 67, 68, 73, 75, 79, 84, 85, 86, 87, 88, 89, 92, 93], $Vn, { 74: $Vo }), o($Vi, [2, 49], { 91: 65, 92: $Vj, 93: $Vk }), { 73: $Vc, 90: 66 }, o($Vp, [2, 106], { 76: 67 }), { 20: 28, 49: 68, 50: 69, 64: 29, 65: 38, 66: 39, 67: $V3, 71: 27, 72: 30, 73: $V4, 75: $V5, 82: 31, 83: 32, 84: $V6, 85: $V7, 86: $V8, 87: $V9, 88: $Va, 89: $Vb, 90: 41 }, o($Vq, [2, 88], { 54: 70 }), o($Vm, $Vn), { 25: 71, 38: 73, 39: $Vr, 43: 74, 44: $Vs, 45: 72, 47: [2, 60] }, { 28: 77, 43: 78, 44: $Vs, 47: [2, 62] }, { 13: 80, 15: $V1, 18: [1, 79] }, o($Vh, [2, 92], { 58: 81 }), { 26: 82, 47: $Vt }, o($Vu, [2, 64], { 30: 84 }), { 91: 61, 92: $Vj, 93: $Vk }, o($Vu, [2, 70], { 35: 85 }), o($Vv, [2, 56], { 21: 86 }), o($Vh, [2, 96], { 62: 87 }), o($V2, [2, 22]), { 20: 28, 33: [2, 86], 49: 90, 50: 89, 52: 88, 64: 29, 65: 38, 66: 39, 67: $V3, 71: 27, 72: 30, 73: $V4, 75: $V5, 82: 31, 83: 32, 84: $V6, 85: $V7, 86: $V8, 87: $V9, 88: $Va, 89: $Vb, 90: 41 }, o($Vl, [2, 105]), { 74: $Vo }, { 73: $Vc, 90: 91 }, { 73: [2, 46] }, { 73: [2, 47] }, { 20: 28, 50: 92, 64: 29, 65: 38, 66: 39, 67: $V3, 73: $Vc, 75: $V5, 82: 31, 83: 32, 84: $V6, 85: $V7, 86: $V8, 87: $V9, 88: $Va, 89: $Vb, 90: 41 }, { 73: [1, 93] }, o($Vi, [2, 45], { 91: 65, 92: $Vj, 93: $Vk }), { 20: 28, 50: 95, 64: 29, 65: 38, 66: 39, 67: $V3, 73: $Vc, 75: $V5, 77: [1, 94], 82: 31, 83: 32, 84: $V6, 85: $V7, 86: $V8, 87: $V9, 88: $Va, 89: $Vb, 90: 41 }, { 68: [1, 96] }, o($Vw, [2, 100], { 69: 97 }), { 20: 28, 49: 100, 50: 99, 55: 98, 56: [2, 90], 64: 29, 65: 38, 66: 39, 67: $V3, 71: 27, 72: 30, 73: $V4, 75: $V5, 82: 31, 83: 32, 84: $V6, 85: $V7, 86: $V8, 87: $V9, 88: $Va, 89: $Vb, 90: 41 }, { 26: 101, 47: $Vt }, { 47: [2, 61] }, o($Vd, $V0, { 6: 3, 4: 102 }), { 47: [2, 20] }, { 20: 103, 64: 53, 65: 38, 66: 39, 67: $V3, 73: $Vc, 75: $V5, 82: 31, 83: 32, 84: $V6, 85: $V7, 86: $V8, 87: $V9, 88: $Va, 89: $Vb, 90: 41 }, o($Vg, $V0, { 6: 3, 4: 104 }), { 26: 105, 47: $Vt }, { 47: [2, 63] }, o($V2, [2, 11]), o($Vf, [2, 55]), { 20: 28, 33: [2, 94], 49: 108, 50: 107, 59: 106, 64: 29, 65: 38, 66: 39, 67: $V3, 71: 27, 72: 30, 73: $V4, 75: $V5, 82: 31, 83: 32, 84: $V6, 85: $V7, 86: $V8, 87: $V9, 88: $Va, 89: $Vb, 90: 41 }, o($V2, [2, 26]), { 20: 109, 64: 53, 65: 38, 66: 39, 67: $V3, 73: $Vc, 75: $V5, 82: 31, 83: 32, 84: $V6, 85: $V7, 86: $V8, 87: $V9, 88: $Va, 89: $Vb, 90: 41 }, o($Vx, [2, 66], { 71: 27, 20: 28, 64: 29, 72: 30, 82: 31, 83: 32, 65: 38, 66: 39, 90: 41, 31: 110, 50: 111, 49: 112, 67: $V3, 73: $V4, 75: $V5, 84: $V6, 85: $V7, 86: $V8, 87: $V9, 88: $Va, 89: $Vb }), o($Vx, [2, 72], { 71: 27, 20: 28, 64: 29, 72: 30, 82: 31, 83: 32, 65: 38, 66: 39, 90: 41, 36: 113, 50: 114, 49: 115, 67: $V3, 73: $V4, 75: $V5, 84: $V6, 85: $V7, 86: $V8, 87: $V9, 88: $Va, 89: $Vb }), { 20: 28, 22: 116, 23: [2, 58], 49: 118, 50: 117, 64: 29, 65: 38, 66: 39, 67: $V3, 71: 27, 72: 30, 73: $V4, 75: $V5, 82: 31, 83: 32, 84: $V6, 85: $V7, 86: $V8, 87: $V9, 88: $Va, 89: $Vb, 90: 41 }, { 20: 28, 33: [2, 98], 49: 121, 50: 120, 63: 119, 64: 29, 65: 38, 66: 39, 67: $V3, 71: 27, 72: 30, 73: $V4, 75: $V5, 82: 31, 83: 32, 84: $V6, 85: $V7, 86: $V8, 87: $V9, 88: $Va, 89: $Vb, 90: 41 }, { 33: [1, 122] }, o($Vh, [2, 85]), { 33: [2, 87] }, o($Vi, [2, 48], { 91: 65, 92: $Vj, 93: $Vk }), o($Vl, [2, 35]), o($Vm, [2, 50]), o($Vm, [2, 36]), o($Vp, [2, 107]), o($Vm, [2, 32]), { 20: 28, 49: 125, 50: 124, 64: 29, 65: 38, 66: 39, 67: $V3, 68: [2, 102], 70: 123, 71: 27, 72: 30, 73: $V4, 75: $V5, 82: 31, 83: 32, 84: $V6, 85: $V7, 86: $V8, 87: $V9, 88: $Va, 89: $Vb, 90: 41 }, { 56: [1, 126] }, o($Vq, [2, 89]), { 56: [2, 91] }, o($V2, [2, 13]), { 38: 73, 39: $Vr, 43: 74, 44: $Vs, 45: 128, 46: 127, 47: [2, 82] }, o($Vu, [2, 76], { 40: 129 }), { 47: [2, 18] }, o($V2, [2, 14]), { 33: [1, 130] }, o($Vh, [2, 93]), { 33: [2, 95] }, { 33: [1, 131] }, { 32: 132, 33: [2, 68], 78: 133, 79: $Vy }, o($Vu, [2, 65]), o($Vx, [2, 67]), { 33: [2, 74], 37: 135, 78: 136, 79: $Vy }, o($Vu, [2, 71]), o($Vx, [2, 73]), { 23: [1, 137] }, o($Vv, [2, 57]), { 23: [2, 59] }, { 33: [1, 138] }, o($Vh, [2, 97]), { 33: [2, 99] }, o($V2, [2, 23]), { 68: [1, 139] }, o($Vw, [2, 101]), { 68: [2, 103] }, o($V2, [2, 24]), { 47: [2, 19] }, { 47: [2, 83] }, o($Vx, [2, 78], { 71: 27, 20: 28, 64: 29, 72: 30, 82: 31, 83: 32, 65: 38, 66: 39, 90: 41, 41: 140, 50: 141, 49: 142, 67: $V3, 73: $V4, 75: $V5, 84: $V6, 85: $V7, 86: $V8, 87: $V9, 88: $Va, 89: $Vb }), o($V2, [2, 25]), o($V2, [2, 21]), { 33: [1, 143] }, { 33: [2, 69] }, { 73: [1, 145], 80: 144 }, { 33: [1, 146] }, { 33: [2, 75] }, o($Vf, [2, 12]), o($Vg, [2, 27]), o($Vm, [2, 33]), { 33: [2, 80], 42: 147, 78: 148, 79: $Vy }, o($Vu, [2, 77]), o($Vx, [2, 79]), o($Vd, [2, 15]), { 73: [1, 150], 81: [1, 149] }, o($Vz, [2, 108]), o($Ve, [2, 16]), { 33: [1, 151] }, { 33: [2, 81] }, { 33: [2, 37] }, o($Vz, [2, 109]), o($Vd, [2, 17])],
    defaultActions: { 4: [2, 1], 62: [2, 46], 63: [2, 47], 72: [2, 61], 74: [2, 20], 78: [2, 63], 90: [2, 87], 100: [2, 91], 104: [2, 18], 108: [2, 95], 118: [2, 59], 121: [2, 99], 125: [2, 103], 127: [2, 19], 128: [2, 83], 133: [2, 69], 136: [2, 75], 148: [2, 81], 149: [2, 37] },
    parseError: function parseError(str, hash) {
      if (hash.recoverable) {
        this.trace(str);
      } else {
        var error = new Error(str);
        error.hash = hash;
        throw error;
      }
    },
    parse: function parse2(input) {
      var self = this, stack = [0], tstack = [], vstack = [null], lstack = [], table = this.table, yytext = "", yylineno = 0, yyleng = 0, recovering = 0, TERROR = 2, EOF = 1;
      var args = lstack.slice.call(arguments, 1);
      var lexer2 = Object.create(this.lexer);
      var sharedState = { yy: {} };
      for (var k in this.yy) {
        if (Object.prototype.hasOwnProperty.call(this.yy, k)) {
          sharedState.yy[k] = this.yy[k];
        }
      }
      lexer2.setInput(input, sharedState.yy);
      sharedState.yy.lexer = lexer2;
      sharedState.yy.parser = this;
      if (typeof lexer2.yylloc == "undefined") {
        lexer2.yylloc = {};
      }
      var yyloc = lexer2.yylloc;
      lstack.push(yyloc);
      var ranges = lexer2.options && lexer2.options.ranges;
      if (typeof sharedState.yy.parseError === "function") {
        this.parseError = sharedState.yy.parseError;
      } else {
        this.parseError = Object.getPrototypeOf(this).parseError;
      }
      function popStack(n) {
        stack.length = stack.length - 2 * n;
        vstack.length = vstack.length - n;
        lstack.length = lstack.length - n;
      }
      _token_stack: var lex = function() {
        var token;
        token = lexer2.lex() || EOF;
        if (typeof token !== "number") {
          token = self.symbols_[token] || token;
        }
        return token;
      };
      var symbol, preErrorSymbol, state, action, a, r, yyval = {}, p, len, newState, expected;
      while (true) {
        state = stack[stack.length - 1];
        if (this.defaultActions[state]) {
          action = this.defaultActions[state];
        } else {
          if (symbol === null || typeof symbol == "undefined") {
            symbol = lex();
          }
          action = table[state] && table[state][symbol];
        }
        if (typeof action === "undefined" || !action.length || !action[0]) {
          var errStr = "";
          expected = [];
          for (p in table[state]) {
            if (this.terminals_[p] && p > TERROR) {
              expected.push("'" + this.terminals_[p] + "'");
            }
          }
          if (lexer2.showPosition) {
            errStr = "Parse error on line " + (yylineno + 1) + ":\n" + lexer2.showPosition() + "\nExpecting " + expected.join(", ") + ", got '" + (this.terminals_[symbol] || symbol) + "'";
          } else {
            errStr = "Parse error on line " + (yylineno + 1) + ": Unexpected " + (symbol == EOF ? "end of input" : "'" + (this.terminals_[symbol] || symbol) + "'");
          }
          this.parseError(errStr, {
            text: lexer2.match,
            token: this.terminals_[symbol] || symbol,
            line: lexer2.yylineno,
            loc: yyloc,
            expected
          });
        }
        if (action[0] instanceof Array && action.length > 1) {
          throw new Error("Parse Error: multiple actions possible at state: " + state + ", token: " + symbol);
        }
        switch (action[0]) {
          case 1:
            stack.push(symbol);
            vstack.push(lexer2.yytext);
            lstack.push(lexer2.yylloc);
            stack.push(action[1]);
            symbol = null;
            if (!preErrorSymbol) {
              yyleng = lexer2.yyleng;
              yytext = lexer2.yytext;
              yylineno = lexer2.yylineno;
              yyloc = lexer2.yylloc;
              if (recovering > 0) {
                recovering--;
              }
            } else {
              symbol = preErrorSymbol;
              preErrorSymbol = null;
            }
            break;
          case 2:
            len = this.productions_[action[1]][1];
            yyval.$ = vstack[vstack.length - len];
            yyval._$ = {
              first_line: lstack[lstack.length - (len || 1)].first_line,
              last_line: lstack[lstack.length - 1].last_line,
              first_column: lstack[lstack.length - (len || 1)].first_column,
              last_column: lstack[lstack.length - 1].last_column
            };
            if (ranges) {
              yyval._$.range = [
                lstack[lstack.length - (len || 1)].range[0],
                lstack[lstack.length - 1].range[1]
              ];
            }
            r = this.performAction.apply(yyval, [
              yytext,
              yyleng,
              yylineno,
              sharedState.yy,
              action[1],
              vstack,
              lstack
            ].concat(args));
            if (typeof r !== "undefined") {
              return r;
            }
            if (len) {
              stack = stack.slice(0, -1 * len * 2);
              vstack = vstack.slice(0, -1 * len);
              lstack = lstack.slice(0, -1 * len);
            }
            stack.push(this.productions_[action[1]][0]);
            vstack.push(yyval.$);
            lstack.push(yyval._$);
            newState = table[stack[stack.length - 2]][stack[stack.length - 1]];
            stack.push(newState);
            break;
          case 3:
            return true;
        }
      }
      return true;
    }
  };
  var lexer = /* @__PURE__ */ (function() {
    var lexer2 = {
      EOF: 1,
      parseError: function parseError(str, hash) {
        if (this.yy.parser) {
          this.yy.parser.parseError(str, hash);
        } else {
          throw new Error(str);
        }
      },
      // resets the lexer, sets new input
      setInput: function(input, yy) {
        this.yy = yy || this.yy || {};
        this._input = input;
        this._more = this._backtrack = this.done = false;
        this.yylineno = this.yyleng = 0;
        this.yytext = this.matched = this.match = "";
        this.conditionStack = ["INITIAL"];
        this.yylloc = {
          first_line: 1,
          first_column: 0,
          last_line: 1,
          last_column: 0
        };
        if (this.options.ranges) {
          this.yylloc.range = [0, 0];
        }
        this.offset = 0;
        return this;
      },
      // consumes and returns one char from the input
      input: function() {
        var ch = this._input[0];
        this.yytext += ch;
        this.yyleng++;
        this.offset++;
        this.match += ch;
        this.matched += ch;
        var lines = ch.match(/(?:\r\n?|\n).*/g);
        if (lines) {
          this.yylineno++;
          this.yylloc.last_line++;
        } else {
          this.yylloc.last_column++;
        }
        if (this.options.ranges) {
          this.yylloc.range[1]++;
        }
        this._input = this._input.slice(1);
        return ch;
      },
      // unshifts one char (or a string) into the input
      unput: function(ch) {
        var len = ch.length;
        var lines = ch.split(/(?:\r\n?|\n)/g);
        this._input = ch + this._input;
        this.yytext = this.yytext.substr(0, this.yytext.length - len);
        this.offset -= len;
        var oldLines = this.match.split(/(?:\r\n?|\n)/g);
        this.match = this.match.substr(0, this.match.length - 1);
        this.matched = this.matched.substr(0, this.matched.length - 1);
        if (lines.length - 1) {
          this.yylineno -= lines.length - 1;
        }
        var r = this.yylloc.range;
        this.yylloc = {
          first_line: this.yylloc.first_line,
          last_line: this.yylineno + 1,
          first_column: this.yylloc.first_column,
          last_column: lines ? (lines.length === oldLines.length ? this.yylloc.first_column : 0) + oldLines[oldLines.length - lines.length].length - lines[0].length : this.yylloc.first_column - len
        };
        if (this.options.ranges) {
          this.yylloc.range = [r[0], r[0] + this.yyleng - len];
        }
        this.yyleng = this.yytext.length;
        return this;
      },
      // When called from action, caches matched text and appends it on next action
      more: function() {
        this._more = true;
        return this;
      },
      // When called from action, signals the lexer that this rule fails to match the input, so the next matching rule (regex) should be tested instead.
      reject: function() {
        if (this.options.backtrack_lexer) {
          this._backtrack = true;
        } else {
          return this.parseError("Lexical error on line " + (this.yylineno + 1) + ". You can only invoke reject() in the lexer when the lexer is of the backtracking persuasion (options.backtrack_lexer = true).\n" + this.showPosition(), {
            text: "",
            token: null,
            line: this.yylineno
          });
        }
        return this;
      },
      // retain first n characters of the match
      less: function(n) {
        this.unput(this.match.slice(n));
      },
      // displays already matched input, i.e. for error messages
      pastInput: function() {
        var past = this.matched.substr(0, this.matched.length - this.match.length);
        return (past.length > 20 ? "..." : "") + past.substr(-20).replace(/\n/g, "");
      },
      // displays upcoming input, i.e. for error messages
      upcomingInput: function() {
        var next = this.match;
        if (next.length < 20) {
          next += this._input.substr(0, 20 - next.length);
        }
        return (next.substr(0, 20) + (next.length > 20 ? "..." : "")).replace(/\n/g, "");
      },
      // displays the character position where the lexing error occurred, i.e. for error messages
      showPosition: function() {
        var pre = this.pastInput();
        var c = new Array(pre.length + 1).join("-");
        return pre + this.upcomingInput() + "\n" + c + "^";
      },
      // test the lexed token: return FALSE when not a match, otherwise return token
      test_match: function(match, indexed_rule) {
        var token, lines, backup;
        if (this.options.backtrack_lexer) {
          backup = {
            yylineno: this.yylineno,
            yylloc: {
              first_line: this.yylloc.first_line,
              last_line: this.last_line,
              first_column: this.yylloc.first_column,
              last_column: this.yylloc.last_column
            },
            yytext: this.yytext,
            match: this.match,
            matches: this.matches,
            matched: this.matched,
            yyleng: this.yyleng,
            offset: this.offset,
            _more: this._more,
            _input: this._input,
            yy: this.yy,
            conditionStack: this.conditionStack.slice(0),
            done: this.done
          };
          if (this.options.ranges) {
            backup.yylloc.range = this.yylloc.range.slice(0);
          }
        }
        lines = match[0].match(/(?:\r\n?|\n).*/g);
        if (lines) {
          this.yylineno += lines.length;
        }
        this.yylloc = {
          first_line: this.yylloc.last_line,
          last_line: this.yylineno + 1,
          first_column: this.yylloc.last_column,
          last_column: lines ? lines[lines.length - 1].length - lines[lines.length - 1].match(/\r?\n?/)[0].length : this.yylloc.last_column + match[0].length
        };
        this.yytext += match[0];
        this.match += match[0];
        this.matches = match;
        this.yyleng = this.yytext.length;
        if (this.options.ranges) {
          this.yylloc.range = [this.offset, this.offset += this.yyleng];
        }
        this._more = false;
        this._backtrack = false;
        this._input = this._input.slice(match[0].length);
        this.matched += match[0];
        token = this.performAction.call(this, this.yy, this, indexed_rule, this.conditionStack[this.conditionStack.length - 1]);
        if (this.done && this._input) {
          this.done = false;
        }
        if (token) {
          return token;
        } else if (this._backtrack) {
          for (var k in backup) {
            this[k] = backup[k];
          }
          return false;
        }
        return false;
      },
      // return next match in input
      next: function() {
        if (this.done) {
          return this.EOF;
        }
        if (!this._input) {
          this.done = true;
        }
        var token, match, tempMatch, index;
        if (!this._more) {
          this.yytext = "";
          this.match = "";
        }
        var rules = this._currentRules();
        for (var i = 0; i < rules.length; i++) {
          tempMatch = this._input.match(this.rules[rules[i]]);
          if (tempMatch && (!match || tempMatch[0].length > match[0].length)) {
            match = tempMatch;
            index = i;
            if (this.options.backtrack_lexer) {
              token = this.test_match(tempMatch, rules[i]);
              if (token !== false) {
                return token;
              } else if (this._backtrack) {
                match = false;
                continue;
              } else {
                return false;
              }
            } else if (!this.options.flex) {
              break;
            }
          }
        }
        if (match) {
          token = this.test_match(match, rules[index]);
          if (token !== false) {
            return token;
          }
          return false;
        }
        if (this._input === "") {
          return this.EOF;
        } else {
          return this.parseError("Lexical error on line " + (this.yylineno + 1) + ". Unrecognized text.\n" + this.showPosition(), {
            text: "",
            token: null,
            line: this.yylineno
          });
        }
      },
      // return next match that has a token
      lex: function lex() {
        var r = this.next();
        if (r) {
          return r;
        } else {
          return this.lex();
        }
      },
      // activates a new lexer condition state (pushes the new lexer condition state onto the condition stack)
      begin: function begin(condition) {
        this.conditionStack.push(condition);
      },
      // pop the previously active lexer condition state off the condition stack
      popState: function popState() {
        var n = this.conditionStack.length - 1;
        if (n > 0) {
          return this.conditionStack.pop();
        } else {
          return this.conditionStack[0];
        }
      },
      // produce the lexer rule set which is active for the currently active lexer condition state
      _currentRules: function _currentRules() {
        if (this.conditionStack.length && this.conditionStack[this.conditionStack.length - 1]) {
          return this.conditions[this.conditionStack[this.conditionStack.length - 1]].rules;
        } else {
          return this.conditions["INITIAL"].rules;
        }
      },
      // return the currently active lexer condition state; when an index argument is provided it produces the N-th previous condition state, if available
      topState: function topState(n) {
        n = this.conditionStack.length - 1 - Math.abs(n || 0);
        if (n >= 0) {
          return this.conditionStack[n];
        } else {
          return "INITIAL";
        }
      },
      // alias for begin(condition)
      pushState: function pushState(condition) {
        this.begin(condition);
      },
      // return the number of states currently on the stack
      stateStackSize: function stateStackSize() {
        return this.conditionStack.length;
      },
      options: {},
      performAction: function anonymous(yy, yy_, $avoiding_name_collisions, YY_START) {
        function strip(start, end) {
          return yy_.yytext = yy_.yytext.substring(start, yy_.yyleng - end + start);
        }
        var YYSTATE = YY_START;
        switch ($avoiding_name_collisions) {
          case 0:
            if (yy_.yytext.slice(-2) === "\\\\") {
              strip(0, 1);
              this.begin("mu");
            } else if (yy_.yytext.slice(-1) === "\\") {
              strip(0, 1);
              this.begin("emu");
            } else {
              this.begin("mu");
            }
            if (yy_.yytext)
              return 15;
            break;
          case 1:
            return 15;
            break;
          case 2:
            this.popState();
            return 15;
            break;
          case 3:
            this.begin("raw");
            return 15;
            break;
          case 4:
            this.popState();
            if (this.conditionStack[this.conditionStack.length - 1] === "raw") {
              return 15;
            } else {
              strip(5, 9);
              return 18;
            }
            break;
          case 5:
            return 15;
            break;
          case 6:
            this.popState();
            return 14;
            break;
          case 7:
            return 67;
            break;
          case 8:
            return 68;
            break;
          case 9:
            if (yy.syntax.square === "string") {
              this.unput(yy_.yytext);
              this.begin("escl");
            } else {
              return 75;
            }
            break;
          case 10:
            return 77;
            break;
          case 11:
            return 19;
            break;
          case 12:
            this.popState();
            this.begin("raw");
            return 23;
            break;
          case 13:
            return 57;
            break;
          case 14:
            return 61;
            break;
          case 15:
            return 29;
            break;
          case 16:
            return 47;
            break;
          case 17:
            this.popState();
            return 44;
            break;
          case 18:
            this.popState();
            return 44;
            break;
          case 19:
            return 34;
            break;
          case 20:
            return 39;
            break;
          case 21:
            return 53;
            break;
          case 22:
            return 48;
            break;
          case 23:
            this.unput(yy_.yytext);
            this.popState();
            this.begin("com");
            break;
          case 24:
            this.popState();
            return 14;
            break;
          case 25:
            return 48;
            break;
          case 26:
            return 74;
            break;
          case 27:
            return 73;
            break;
          case 28:
            return 73;
            break;
          case 29:
            return 93;
            break;
          case 30:
            return 92;
            break;
          case 31:
            break;
          case 32:
            this.popState();
            return 56;
            break;
          case 33:
            this.popState();
            return 33;
            break;
          case 34:
            yy_.yytext = strip(1, 2).replace(/\\"/g, '"');
            return 84;
            break;
          case 35:
            yy_.yytext = strip(1, 2).replace(/\\'/g, "'");
            return 84;
            break;
          case 36:
            return 89;
            break;
          case 37:
            return 86;
            break;
          case 38:
            return 86;
            break;
          case 39:
            return 87;
            break;
          case 40:
            return 88;
            break;
          case 41:
            return 85;
            break;
          case 42:
            return 79;
            break;
          case 43:
            return 81;
            break;
          case 44:
            return 73;
            break;
          case 45:
            yy_.yytext = yy_.yytext.replace(/\\([\\\]])/g, "$1");
            this.popState();
            return 73;
            break;
          case 46:
            return "INVALID";
            break;
          case 47:
            return 5;
            break;
        }
      },
      rules: [/^(?:[^\x00]*?(?=(\{\{)))/, /^(?:[^\x00]+)/, /^(?:[^\x00]{2,}?(?=(\{\{|\\\{\{|\\\\\{\{|$)))/, /^(?:\{\{\{\{(?=[^/]))/, /^(?:\{\{\{\{\/[^\s!"#%-,\.\/;->@\[-\^`\{-~]+(?=[=}\s\/.])\}\}\}\})/, /^(?:[^\x00]+?(?=(\{\{\{\{)))/, /^(?:[\s\S]*?--(~)?\}\})/, /^(?:\()/, /^(?:\))/, /^(?:\[)/, /^(?:\])/, /^(?:\{\{\{\{)/, /^(?:\}\}\}\})/, /^(?:\{\{(~)?>)/, /^(?:\{\{(~)?#>)/, /^(?:\{\{(~)?#\*?)/, /^(?:\{\{(~)?\/)/, /^(?:\{\{(~)?\^\s*(~)?\}\})/, /^(?:\{\{(~)?\s*else\s*(~)?\}\})/, /^(?:\{\{(~)?\^)/, /^(?:\{\{(~)?\s*else\b)/, /^(?:\{\{(~)?\{)/, /^(?:\{\{(~)?&)/, /^(?:\{\{(~)?!--)/, /^(?:\{\{(~)?![\s\S]*?\}\})/, /^(?:\{\{(~)?\*?)/, /^(?:=)/, /^(?:\.\.)/, /^(?:\.(?=([=~}\s\/.)\]|])))/, /^(?:\.#)/, /^(?:[\/.])/, /^(?:\s+)/, /^(?:\}(~)?\}\})/, /^(?:(~)?\}\})/, /^(?:"(\\["]|[^"])*")/, /^(?:'(\\[']|[^'])*')/, /^(?:@)/, /^(?:true(?=([~}\s)\]])))/, /^(?:false(?=([~}\s)\]])))/, /^(?:undefined(?=([~}\s)\]])))/, /^(?:null(?=([~}\s)\]])))/, /^(?:-?[0-9]+(?:\.[0-9]+)?(?=([~}\s)\]])))/, /^(?:as\s+\|)/, /^(?:\|)/, /^(?:([^\s!"#%-,\.\/;->@\[-\^`\{-~]+(?=([=~}\s\/.)\]|]))))/, /^(?:\[(\\\]|[^\]])*\])/, /^(?:.)/, /^(?:$)/],
      conditions: { "mu": { "rules": [7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25, 26, 27, 28, 29, 30, 31, 32, 33, 34, 35, 36, 37, 38, 39, 40, 41, 42, 43, 44, 46, 47], "inclusive": false }, "emu": { "rules": [2], "inclusive": false }, "com": { "rules": [6], "inclusive": false }, "raw": { "rules": [3, 4, 5], "inclusive": false }, "escl": { "rules": [45], "inclusive": false }, "INITIAL": { "rules": [0, 1, 47], "inclusive": true } }
    };
    return lexer2;
  })();
  parser2.lexer = lexer;
  function Parser() {
    this.yy = {};
  }
  Parser.prototype = parser2;
  parser2.Parser = Parser;
  return new Parser();
})();
var parser_default = parser;

// node_modules/@handlebars/parser/dist/esm/printer.js
var __spreadArray = function(to, from, pack) {
  if (pack || arguments.length === 2) for (var i = 0, l = from.length, ar; i < l; i++) {
    if (ar || !(i in from)) {
      if (!ar) ar = Array.prototype.slice.call(from, 0, i);
      ar[i] = from[i];
    }
  }
  return to.concat(ar || Array.prototype.slice.call(from));
};
function PrintVisitor() {
  this.padding = 0;
}
PrintVisitor.prototype = new visitor_default();
PrintVisitor.prototype.pad = function(string) {
  var out = "";
  for (var i = 0, l = this.padding; i < l; i++) {
    out += "  ";
  }
  out += string + "\n";
  return out;
};
PrintVisitor.prototype.Program = function(program) {
  var out = "", body = program.body, i, l;
  if (program.blockParams) {
    var blockParams = "BLOCK PARAMS: [";
    for (i = 0, l = program.blockParams.length; i < l; i++) {
      blockParams += " " + program.blockParams[i];
    }
    blockParams += " ]";
    out += this.pad(blockParams);
  }
  for (i = 0, l = body.length; i < l; i++) {
    out += this.accept(body[i]);
  }
  this.padding--;
  return out;
};
PrintVisitor.prototype.MustacheStatement = function(mustache) {
  if (mustache.params.length > 0 || mustache.hash) {
    return this.pad("{{ " + this.callBody(mustache) + " }}");
  } else {
    return this.pad("{{ " + this.accept(mustache.path) + " }}");
  }
};
PrintVisitor.prototype.Decorator = function(mustache) {
  return this.pad("{{ DIRECTIVE " + this.callBody(mustache) + " }}");
};
PrintVisitor.prototype.BlockStatement = PrintVisitor.prototype.DecoratorBlock = function(block) {
  var out = "";
  out += this.pad((block.type === "DecoratorBlock" ? "DIRECTIVE " : "") + "BLOCK:");
  this.padding++;
  out += this.pad(this.callBody(block));
  if (block.program) {
    out += this.pad("PROGRAM:");
    this.padding++;
    out += this.accept(block.program);
    this.padding--;
  }
  if (block.inverse) {
    if (block.program) {
      this.padding++;
    }
    out += this.pad("{{^}}");
    this.padding++;
    out += this.accept(block.inverse);
    this.padding--;
    if (block.program) {
      this.padding--;
    }
  }
  this.padding--;
  return out;
};
PrintVisitor.prototype.PartialStatement = function(partial) {
  var content = "PARTIAL:" + partial.name.original;
  if (partial.params[0]) {
    content += " " + this.accept(partial.params[0]);
  }
  if (partial.hash) {
    content += " " + this.accept(partial.hash);
  }
  return this.pad("{{> " + content + " }}");
};
PrintVisitor.prototype.PartialBlockStatement = function(partial) {
  var content = "PARTIAL BLOCK:" + partial.name.original;
  if (partial.params[0]) {
    content += " " + this.accept(partial.params[0]);
  }
  if (partial.hash) {
    content += " " + this.accept(partial.hash);
  }
  content += " " + this.pad("PROGRAM:");
  this.padding++;
  content += this.accept(partial.program);
  this.padding--;
  return this.pad("{{> " + content + " }}");
};
PrintVisitor.prototype.ContentStatement = function(content) {
  return this.pad("CONTENT[ '" + content.value + "' ]");
};
PrintVisitor.prototype.CommentStatement = function(comment) {
  return this.pad("{{! '" + comment.value + "' }}");
};
PrintVisitor.prototype.SubExpression = function(sexpr) {
  return "(".concat(this.callBody(sexpr), ")");
};
PrintVisitor.prototype.callBody = function(callExpr) {
  var params = callExpr.params, paramStrings = [], hash;
  for (var i = 0, l = params.length; i < l; i++) {
    paramStrings.push(this.accept(params[i]));
  }
  params = paramStrings.length === 0 ? "" : " [" + paramStrings.join(", ") + "]";
  hash = callExpr.hash ? " " + this.accept(callExpr.hash) : "";
  return this.accept(callExpr.path) + params + hash;
};
PrintVisitor.prototype.PathExpression = function(id2) {
  var head = typeof id2.head === "string" ? id2.head : "[".concat(this.accept(id2.head), "]");
  var path = __spreadArray([head], id2.tail, true).join("/");
  return "p%" + prefix(id2) + path;
};
function prefix(path) {
  if (path.data) {
    return "@";
  } else if (path.this) {
    return "this.";
  } else {
    return "";
  }
}
PrintVisitor.prototype.StringLiteral = function(string) {
  return '"' + string.value + '"';
};
PrintVisitor.prototype.NumberLiteral = function(number) {
  return "n%" + number.value;
};
PrintVisitor.prototype.BooleanLiteral = function(bool) {
  return "b%" + bool.value;
};
PrintVisitor.prototype.UndefinedLiteral = function() {
  return "UNDEFINED";
};
PrintVisitor.prototype.NullLiteral = function() {
  return "NULL";
};
PrintVisitor.prototype.ArrayLiteral = function(array) {
  var _this = this;
  return "Array[".concat(array.items.map(function(item) {
    return _this.accept(item);
  }).join(", "), "]");
};
PrintVisitor.prototype.HashLiteral = function(hash) {
  return "Hash{".concat(this.hashPairs(hash), "}");
};
PrintVisitor.prototype.Hash = function(hash) {
  return "HASH{".concat(this.hashPairs(hash), "}");
};
PrintVisitor.prototype.hashPairs = function(hash) {
  var pairs = hash.pairs, joinedPairs = [];
  for (var i = 0, l = pairs.length; i < l; i++) {
    joinedPairs.push(this.HashPair(pairs[i]));
  }
  return joinedPairs.join(" ");
};
PrintVisitor.prototype.HashPair = function(pair) {
  return pair.key + "=" + this.accept(pair.value);
};

// node_modules/@handlebars/parser/dist/esm/helpers.js
var helpers_exports = {};
__export(helpers_exports, {
  SourceLocation: () => SourceLocation,
  id: () => id,
  prepareBlock: () => prepareBlock,
  prepareMustache: () => prepareMustache,
  preparePartialBlock: () => preparePartialBlock,
  preparePath: () => preparePath,
  prepareProgram: () => prepareProgram,
  prepareRawBlock: () => prepareRawBlock,
  stripComment: () => stripComment,
  stripFlags: () => stripFlags
});
var __spreadArray2 = function(to, from, pack) {
  if (pack || arguments.length === 2) for (var i = 0, l = from.length, ar; i < l; i++) {
    if (ar || !(i in from)) {
      if (!ar) ar = Array.prototype.slice.call(from, 0, i);
      ar[i] = from[i];
    }
  }
  return to.concat(ar || Array.prototype.slice.call(from));
};
function validateClose(open, close) {
  close = close.path ? close.path.original : close;
  if (open.path.original !== close) {
    var errorNode = { loc: open.path.loc };
    throw new exception_default(open.path.original + " doesn't match " + close, errorNode);
  }
}
function SourceLocation(source, locInfo) {
  this.source = source;
  this.start = {
    line: locInfo.first_line,
    column: locInfo.first_column
  };
  this.end = {
    line: locInfo.last_line,
    column: locInfo.last_column
  };
}
function id(token) {
  if (/^\[.*\]$/.test(token)) {
    return token.substring(1, token.length - 1);
  } else {
    return token;
  }
}
function stripFlags(open, close) {
  return {
    open: open.charAt(2) === "~",
    close: close.charAt(close.length - 3) === "~"
  };
}
function stripComment(comment) {
  return comment.replace(/^\{\{~?!-?-?/, "").replace(/-?-?~?\}\}$/, "");
}
function preparePath(data, sexpr, parts, loc) {
  loc = this.locInfo(loc);
  var original;
  if (data) {
    original = "@";
  } else if (sexpr) {
    original = sexpr.original + ".";
  } else {
    original = "";
  }
  var tail = [];
  var depth = 0;
  for (var i = 0, l = parts.length; i < l; i++) {
    var part = parts[i].part;
    var isLiteral = parts[i].original !== part;
    var separator = parts[i].separator;
    var partPrefix = separator === ".#" ? "#" : "";
    original += (separator || "") + part;
    if (!isLiteral && (part === ".." || part === "." || part === "this")) {
      if (tail.length > 0) {
        throw new exception_default("Invalid path: " + original, { loc });
      } else if (part === "..") {
        depth++;
      }
    } else {
      tail.push("".concat(partPrefix).concat(part));
    }
  }
  var head = sexpr || tail.shift();
  return {
    type: "PathExpression",
    this: original.startsWith("this."),
    data,
    depth,
    head,
    tail,
    parts: head ? __spreadArray2([head], tail, true) : tail,
    original,
    loc
  };
}
function prepareMustache(path, params, hash, open, strip, locInfo) {
  var escapeFlag = open.charAt(3) || open.charAt(2), escaped = escapeFlag !== "{" && escapeFlag !== "&";
  var decorator = /\*/.test(open);
  return {
    type: decorator ? "Decorator" : "MustacheStatement",
    path,
    params,
    hash,
    escaped,
    strip,
    loc: this.locInfo(locInfo)
  };
}
function prepareRawBlock(openRawBlock, contents, close, locInfo) {
  validateClose(openRawBlock, close);
  locInfo = this.locInfo(locInfo);
  var program = {
    type: "Program",
    body: contents,
    strip: {},
    loc: locInfo
  };
  return {
    type: "BlockStatement",
    path: openRawBlock.path,
    params: openRawBlock.params,
    hash: openRawBlock.hash,
    program,
    openStrip: {},
    inverseStrip: {},
    closeStrip: {},
    loc: locInfo
  };
}
function prepareBlock(openBlock, program, inverseAndProgram, close, inverted, locInfo) {
  if (close && close.path) {
    validateClose(openBlock, close);
  }
  var decorator = /\*/.test(openBlock.open);
  program.blockParams = openBlock.blockParams;
  var inverse, inverseStrip;
  if (inverseAndProgram) {
    if (decorator) {
      throw new exception_default("Unexpected inverse block on decorator", inverseAndProgram);
    }
    if (inverseAndProgram.chain) {
      inverseAndProgram.program.body[0].closeStrip = close.strip;
    }
    inverseStrip = inverseAndProgram.strip;
    inverse = inverseAndProgram.program;
  }
  if (inverted) {
    inverted = inverse;
    inverse = program;
    program = inverted;
  }
  return {
    type: decorator ? "DecoratorBlock" : "BlockStatement",
    path: openBlock.path,
    params: openBlock.params,
    hash: openBlock.hash,
    program,
    inverse,
    openStrip: openBlock.strip,
    inverseStrip,
    closeStrip: close && close.strip,
    loc: this.locInfo(locInfo)
  };
}
function prepareProgram(statements, loc) {
  if (!loc && statements.length) {
    var firstLoc = statements[0].loc, lastLoc = statements[statements.length - 1].loc;
    if (firstLoc && lastLoc) {
      loc = {
        source: firstLoc.source,
        start: {
          line: firstLoc.start.line,
          column: firstLoc.start.column
        },
        end: {
          line: lastLoc.end.line,
          column: lastLoc.end.column
        }
      };
    }
  }
  return {
    type: "Program",
    body: statements,
    strip: {},
    loc
  };
}
function preparePartialBlock(open, program, close, locInfo) {
  validateClose(open, close);
  return {
    type: "PartialBlockStatement",
    name: open.path,
    params: open.params,
    hash: open.hash,
    program,
    openStrip: open.strip,
    closeStrip: close && close.strip,
    loc: this.locInfo(locInfo)
  };
}

// node_modules/@handlebars/parser/dist/esm/parse.js
var baseHelpers = {};
for (helper in helpers_exports) {
  if (Object.prototype.hasOwnProperty.call(helpers_exports, helper)) {
    baseHelpers[helper] = helpers_exports[helper];
  }
}
var helper;
function parseWithoutProcessing(input, options) {
  var _a, _b, _c;
  if (input.type === "Program") {
    return input;
  }
  parser_default.yy = baseHelpers;
  parser_default.yy.locInfo = function(locInfo) {
    return new SourceLocation(options && options.srcName, locInfo);
  };
  var squareSyntax;
  if (typeof ((_a = options === null || options === void 0 ? void 0 : options.syntax) === null || _a === void 0 ? void 0 : _a.square) === "function") {
    squareSyntax = options.syntax.square;
  } else if (((_b = options === null || options === void 0 ? void 0 : options.syntax) === null || _b === void 0 ? void 0 : _b.square) === "node") {
    squareSyntax = arrayLiteralNode;
  } else {
    squareSyntax = "string";
  }
  var hashSyntax;
  if (typeof ((_c = options === null || options === void 0 ? void 0 : options.syntax) === null || _c === void 0 ? void 0 : _c.hash) === "function") {
    hashSyntax = options.syntax.hash;
  } else {
    hashSyntax = hashLiteralNode;
  }
  parser_default.yy.syntax = {
    square: squareSyntax,
    hash: hashSyntax
  };
  return parser_default.parse(input);
}
function arrayLiteralNode(array, loc) {
  return {
    type: "ArrayLiteral",
    items: array,
    loc
  };
}
function hashLiteralNode(hash, loc) {
  return {
    type: "HashLiteral",
    pairs: hash.pairs,
    loc
  };
}
function parse(input, options) {
  var ast = parseWithoutProcessing(input, options);
  var strip = new whitespace_control_default(options);
  return strip.accept(ast);
}

// lib/handlebars/utils.js
var escape = {
  "&": "&amp;",
  "<": "&lt;",
  ">": "&gt;",
  '"': "&quot;",
  "'": "&#x27;",
  "`": "&#x60;",
  "=": "&#x3D;"
};
var badChars = /[&<>"'`=]/g;
var possible = /[&<>"'`=]/;
function escapeChar(chr) {
  return escape[chr];
}
function extend(obj) {
  for (let i = 1; i < arguments.length; i++) {
    for (let key in arguments[i]) {
      if (Object.prototype.hasOwnProperty.call(arguments[i], key)) {
        obj[key] = arguments[i][key];
      }
    }
  }
  return obj;
}
var toString = Object.prototype.toString;
function isFunction(value) {
  return typeof value === "function";
}
function testTag(name) {
  const tag = "[object " + name + "]";
  return function(value) {
    return value && typeof value === "object" ? toString.call(value) === tag : false;
  };
}
var isArray = Array.isArray;
var isMap = testTag("Map");
var isSet = testTag("Set");
function indexOf(array, value) {
  for (let i = 0, len = array.length; i < len; i++) {
    if (array[i] === value) {
      return i;
    }
  }
  return -1;
}
function escapeExpression(string) {
  if (typeof string !== "string") {
    if (string && string.toHTML) {
      return string.toHTML();
    } else if (string == null) {
      return "";
    } else if (!string) {
      return string + "";
    }
    string = "" + string;
  }
  if (!possible.test(string)) {
    return string;
  }
  return string.replace(badChars, escapeChar);
}
function isEmpty(value) {
  if (!value && value !== 0) {
    return true;
  } else if (isArray(value) && value.length === 0) {
    return true;
  } else {
    return false;
  }
}
function createFrame(object) {
  let frame = extend({}, object);
  frame._parent = object;
  return frame;
}

// lib/handlebars/logger.js
var logger = {
  methodMap: ["debug", "info", "warn", "error"],
  level: "info",
  // Maps a given level value to the `methodMap` indexes above.
  lookupLevel: function(level) {
    if (typeof level === "string") {
      let levelMap = indexOf(logger.methodMap, level.toLowerCase());
      if (levelMap >= 0) {
        level = levelMap;
      } else {
        level = parseInt(level, 10);
      }
    }
    return level;
  },
  // Can be overridden in the host environment
  log: function(level, ...message) {
    level = logger.lookupLevel(level);
    if (typeof console !== "undefined" && logger.lookupLevel(logger.level) <= level) {
      let method = logger.methodMap[level];
      if (!console[method]) {
        method = "log";
      }
      console[method](...message);
    }
  }
};
var logger_default = logger;

// lib/handlebars/internal/proto-access.js
var loggedProperties = /* @__PURE__ */ Object.create(null);
function createProtoAccessControl(runtimeOptions) {
  const propertyWhiteList = /* @__PURE__ */ Object.create(null);
  propertyWhiteList["__proto__"] = false;
  extend(propertyWhiteList, runtimeOptions.allowedProtoProperties);
  const methodWhiteList = /* @__PURE__ */ Object.create(null);
  methodWhiteList["constructor"] = false;
  methodWhiteList["__defineGetter__"] = false;
  methodWhiteList["__defineSetter__"] = false;
  methodWhiteList["__lookupGetter__"] = false;
  extend(methodWhiteList, runtimeOptions.allowedProtoMethods);
  return {
    properties: {
      whitelist: propertyWhiteList,
      defaultValue: runtimeOptions.allowProtoPropertiesByDefault
    },
    methods: {
      whitelist: methodWhiteList,
      defaultValue: runtimeOptions.allowProtoMethodsByDefault
    }
  };
}
function resultIsAllowed(result, protoAccessControl, propertyName) {
  if (typeof result === "function") {
    return checkWhiteList(protoAccessControl.methods, propertyName);
  } else {
    return checkWhiteList(protoAccessControl.properties, propertyName);
  }
}
function checkWhiteList(protoAccessControlForType, propertyName) {
  if (protoAccessControlForType.whitelist[propertyName] !== void 0) {
    return protoAccessControlForType.whitelist[propertyName] === true;
  }
  if (protoAccessControlForType.defaultValue !== void 0) {
    return protoAccessControlForType.defaultValue;
  }
  logUnexpectedPropertyAccessOnce(propertyName);
  return false;
}
function logUnexpectedPropertyAccessOnce(propertyName) {
  if (loggedProperties[propertyName] !== true) {
    loggedProperties[propertyName] = true;
    logger_default.log(
      "error",
      `Handlebars: Access has been denied to resolve the property "${propertyName}" because it is not an "own property" of its parent.
You can add a runtime option to disable the check or this warning:
See https://handlebarsjs.com/api-reference/runtime-options.html#options-to-control-prototype-access for details`
    );
  }
}

// lib/handlebars/helpers/block-helper-missing.js
function block_helper_missing_default(instance) {
  instance.registerHelper("blockHelperMissing", function(context, options) {
    let inverse = options.inverse, fn = options.fn;
    if (context === true) {
      return fn(this);
    } else if (context === false || context == null) {
      return inverse(this);
    } else if (isArray(context)) {
      if (context.length > 0) {
        return instance.helpers.each(context, options);
      } else {
        return inverse(this);
      }
    } else {
      return fn(context, options);
    }
  });
}

// lib/handlebars/helpers/each.js
function each_default(instance) {
  instance.registerHelper("each", function(context, options) {
    if (!options) {
      throw new exception_default("Must pass iterator to #each");
    }
    let fn = options.fn, inverse = options.inverse, i = 0, ret = "", data;
    if (isFunction(context)) {
      context = context.call(this);
    }
    if (options.data) {
      data = createFrame(options.data);
    }
    function execIteration(field, value, index, last) {
      if (data) {
        data.key = field;
        data.index = index;
        data.first = index === 0;
        data.last = !!last;
      }
      ret = ret + fn(value, {
        data,
        blockParams: [context[field], field]
      });
    }
    if (context && typeof context === "object") {
      if (isArray(context)) {
        for (let j = context.length; i < j; i++) {
          if (i in context) {
            execIteration(i, context[i], i, i === context.length - 1);
          }
        }
      } else if (isMap(context)) {
        const j = context.size;
        for (const [key, value] of context) {
          execIteration(key, value, i++, i === j);
        }
      } else if (isSet(context)) {
        const j = context.size;
        for (const value of context) {
          execIteration(i, value, i++, i === j);
        }
      } else if (typeof Symbol === "function" && context[Symbol.iterator]) {
        const newContext = [];
        const iterator = context[Symbol.iterator]();
        for (let it = iterator.next(); !it.done; it = iterator.next()) {
          newContext.push(it.value);
        }
        context = newContext;
        for (let j = context.length; i < j; i++) {
          execIteration(i, context[i], i, i === context.length - 1);
        }
      } else {
        let priorKey;
        Object.keys(context).forEach((key) => {
          if (priorKey !== void 0) {
            execIteration(priorKey, context[priorKey], i - 1);
          }
          priorKey = key;
          i++;
        });
        if (priorKey !== void 0) {
          execIteration(priorKey, context[priorKey], i - 1, true);
        }
      }
    }
    if (i === 0) {
      ret = inverse(this);
    }
    return ret;
  });
}

// lib/handlebars/helpers/helper-missing.js
function helper_missing_default(instance) {
  instance.registerHelper("helperMissing", function() {
    if (arguments.length === 1) {
      return void 0;
    } else {
      throw new exception_default(
        'Missing helper: "' + arguments[arguments.length - 1].name + '"'
      );
    }
  });
}

// lib/handlebars/helpers/if.js
function if_default(instance) {
  instance.registerHelper("if", function(conditional, options) {
    if (arguments.length != 2) {
      throw new exception_default("#if requires exactly one argument");
    }
    if (isFunction(conditional)) {
      conditional = conditional.call(this);
    }
    if (!options.hash.includeZero && !conditional || isEmpty(conditional)) {
      return options.inverse(this);
    } else {
      return options.fn(this);
    }
  });
  instance.registerHelper("unless", function(conditional, options) {
    if (arguments.length != 2) {
      throw new exception_default("#unless requires exactly one argument");
    }
    return instance.helpers["if"].call(this, conditional, {
      fn: options.inverse,
      inverse: options.fn,
      hash: options.hash
    });
  });
}

// lib/handlebars/helpers/log.js
function log_default(instance) {
  instance.registerHelper("log", function() {
    let args = [void 0], options = arguments[arguments.length - 1];
    for (let i = 0; i < arguments.length - 1; i++) {
      args.push(arguments[i]);
    }
    let level = 1;
    if (options.hash.level != null) {
      level = options.hash.level;
    } else if (options.data && options.data.level != null) {
      level = options.data.level;
    }
    args[0] = level;
    instance.log(...args);
  });
}

// lib/handlebars/helpers/lookup.js
function lookup_default(instance) {
  instance.registerHelper("lookup", function(obj, field, options) {
    if (!obj) {
      return obj;
    }
    return options.lookupProperty(obj, field);
  });
}

// lib/handlebars/helpers/with.js
function with_default(instance) {
  instance.registerHelper("with", function(context, options) {
    if (arguments.length != 2) {
      throw new exception_default("#with requires exactly one argument");
    }
    if (isFunction(context)) {
      context = context.call(this);
    }
    let fn = options.fn;
    if (!isEmpty(context)) {
      let data = options.data;
      return fn(context, {
        data,
        blockParams: [context]
      });
    } else {
      return options.inverse(this);
    }
  });
}

// lib/handlebars/helpers.js
function registerDefaultHelpers(instance) {
  block_helper_missing_default(instance);
  each_default(instance);
  helper_missing_default(instance);
  if_default(instance);
  log_default(instance);
  lookup_default(instance);
  with_default(instance);
}

// lib/handlebars/runtime.js
function noop() {
  return "";
}

// lib/handlebars/compiler/ast.js
var AST = {
  // Public API used to evaluate derived attributes regarding AST nodes
  helpers: {
    // a mustache is definitely a helper if:
    // * it is an eligible helper, and
    // * it has at least one parameter or hash segment
    helperExpression: function(node) {
      return node.type === "SubExpression" || (node.type === "MustacheStatement" || node.type === "BlockStatement") && !!(node.params && node.params.length || node.hash);
    },
    scopedId: function(path) {
      return /^\.|this\b/.test(path.original);
    },
    // an ID is simple if it only has one part, and that part is not
    // `..` or `this`.
    simpleId: function(path) {
      return path.parts.length === 1 && !AST.helpers.scopedId(path) && !path.depth;
    }
  }
};
var ast_default = AST;

// lib/handlebars/safe-string.js
function SafeString(string) {
  this.string = string;
}
SafeString.prototype.toString = SafeString.prototype.toHTML = function() {
  return "" + this.string;
};
var safe_string_default = SafeString;

// src/briskbars.ts
var escapeExpression2 = escapeExpression;
var extend2 = extend;
var isFunction2 = isFunction;
var isMap2 = isMap;
var isSet2 = isSet;
var noopProgram = noop;
var Pending = class {
  promise;
  constructor(promise) {
    this.promise = promise;
  }
};
function invoked(result) {
  return result != null && typeof result.then === "function" ? new Pending(Promise.resolve(result)) : result;
}
function unwrap(value) {
  return value instanceof Pending ? value.promise : value;
}
function chain(value, then) {
  if (value instanceof Pending) {
    return new Pending(value.promise.then((resolved) => unwrap(then(resolved))));
  }
  return then(value);
}
function runFrom(start, count, step, onValue) {
  for (let i = start; i < count; i++) {
    const value = step(i);
    if (value instanceof Pending) {
      const at = i;
      return new Pending(value.promise.then((resolved) => {
        onValue(at, resolved);
        return unwrap(runFrom(at + 1, count, step, onValue));
      }));
    }
    onValue(i, value);
  }
  return void 0;
}
function renderAll(nodes, frame) {
  const count = nodes.length;
  let out = "";
  for (let i = 0; i < count; i++) {
    const value = nodes[i](frame);
    if (value instanceof Pending) {
      const at = i;
      return new Pending(value.promise.then((resolved) => {
        out += resolved || "";
        const rest = runFrom(
          at + 1,
          count,
          (j) => nodes[j](frame),
          (_j, v) => {
            out += v || "";
          }
        );
        return rest ? rest.promise.then(() => out) : out;
      }));
    }
    out += value || "";
  }
  return out;
}
function settle(value) {
  return value instanceof Pending ? value.promise : value;
}
function asCallable(value) {
  return isFunction2(value) ? value : void 0;
}
function asHelperOptions(value) {
  return value != null && typeof value === "object" ? value : void 0;
}
var defaultHelpers = {};
registerDefaultHelpers({
  helpers: defaultHelpers,
  registerHelper(name, fn) {
    defaultHelpers[name] = fn;
  },
  log: logger_default.log
});
defaultHelpers.each = nativeEach;
function derive(frame, context, data, depths, partials, blockParamValues) {
  return {
    context,
    data,
    depths,
    helpers: frame.helpers,
    partials,
    blockParamValues,
    lookupProperty: frame.lookupProperty,
    options: frame.options
  };
}
var emptyHelpers = {};
var emptyPartials = {};
var emptyValues = [];
var emptyScopes = [];
var defaultProtoAccess = createProtoAccessControl({});
function defaultLookupProperty(parent, name) {
  if (parent == null) {
    return void 0;
  }
  if (isMap2(parent)) {
    return parent.get(name);
  }
  const result = parent[name];
  if (result == null) {
    return result;
  }
  if (Object.prototype.hasOwnProperty.call(parent, name)) {
    return result;
  }
  if (resultIsAllowed(result, defaultProtoAccess, name)) {
    return result;
  }
  return void 0;
}
function findBlockParamSlot(scopes, name) {
  for (let depth = 0; depth < scopes.length; depth++) {
    const idx = scopes[depth].indexOf(name);
    if (idx >= 0) {
      return { depth, idx };
    }
  }
  return null;
}
function normalizePath(path) {
  if (path && path.type !== "PathExpression" && path.type !== "SubExpression") {
    const literal = path;
    return {
      type: "PathExpression",
      data: false,
      depth: 0,
      parts: [String(literal.original)],
      original: String(literal.original),
      loc: literal.loc
    };
  }
  return path;
}
function planPath(path, scopes) {
  const parts = path.parts || [];
  const name = parts[0];
  if (path.depth) {
    sawDepthedPath = true;
  }
  const scoped = ast_default.helpers.scopedId(path);
  const simple = path.type === "PathExpression" && !path.data && ast_default.helpers.simpleId(path);
  const eligible = !path.data && !path.depth && !!name && name !== "this" && name !== "." && !scoped;
  return {
    node: path,
    data: !!path.data,
    parts,
    depth: path.depth || 0,
    original: path.original,
    simple,
    blockParam: eligible ? findBlockParamSlot(scopes, name) : null
  };
}
function resolvePlan(plan, frame) {
  if (plan.data) {
    return lookupData(frame, plan.parts, plan.depth);
  }
  const parts = plan.parts;
  if (plan.blockParam) {
    let result2 = frame.blockParamValues[plan.blockParam.depth][plan.blockParam.idx];
    for (let i = 1; i < parts.length; i++) {
      if (result2 == null) {
        return void 0;
      }
      result2 = frame.lookupProperty(result2, parts[i]);
    }
    return result2;
  }
  const ctx = plan.depth ? frame.depths[plan.depth] ?? null : frame.context;
  if (!parts.length || parts[0] === ".") {
    return ctx;
  }
  if (ctx == null) {
    return void 0;
  }
  let result = ctx;
  for (const part of parts) {
    if (result == null) {
      return void 0;
    }
    result = frame.lookupProperty(result, part);
  }
  return result;
}
function lookupData(frame, parts, depth) {
  let d = frame.data;
  for (let i = 0; i < depth; i++) {
    d = d && d._parent;
  }
  if (!parts.length) {
    return d;
  }
  let result = d;
  for (const part of parts) {
    if (result == null) {
      return void 0;
    }
    result = frame.lookupProperty(result, part);
  }
  return result;
}
function findHelper(frame, name) {
  if (name === "each") {
    return defaultHelpers.each;
  }
  if (Object.prototype.hasOwnProperty.call(frame.helpers, name)) {
    return frame.helpers[name];
  }
  if (Object.prototype.hasOwnProperty.call(defaultHelpers, name)) {
    return defaultHelpers[name];
  }
  return void 0;
}
function missingHelper(frame, name) {
  const helper2 = findHelper(frame, name);
  if (!helper2) {
    throw new TypeError('The "' + name + '" helper is not a function');
  }
  return helper2;
}
function lookupHelper(frame, name) {
  if (name === "helperMissing" || name === "blockHelperMissing") {
    throw new exception_default('Missing helper: "' + name + '"');
  }
  return name ? findHelper(frame, name) : void 0;
}
function planCall(params, hash, scopes) {
  const pairs = hash ? hash.pairs : [];
  return {
    params: (params || []).map((param) => buildValue(param, scopes)),
    hashKeys: pairs.map((pair) => pair.key),
    hashValues: pairs.map((pair) => buildValue(pair.value, scopes))
  };
}
function buildHelperOptions(name, hash, frame, fn, inverse) {
  const options = {
    name,
    hash,
    data: frame.data,
    lookupProperty: frame.lookupProperty
  };
  if (fn) {
    options.fn = fn;
  }
  if (inverse) {
    options.inverse = inverse;
  }
  return options;
}
function runHash(plan, frame) {
  const hash = {};
  if (!plan.hashKeys.length) {
    return hash;
  }
  const pending = runFrom(
    0,
    plan.hashValues.length,
    (i) => plan.hashValues[i](frame),
    (i, value) => {
      hash[plan.hashKeys[i]] = value;
    }
  );
  return pending ? new Pending(pending.promise.then(() => hash)) : hash;
}
function runCall(plan, helper2, name, frame, fn, inverse) {
  const params = plan.params;
  const count = params.length;
  const args = new Array(count + 1);
  for (let i = 0; i < count; i++) {
    const value = params[i](frame);
    if (value instanceof Pending) {
      const at = i;
      return new Pending(value.promise.then((resolved) => {
        args[at] = resolved;
        const rest = runFrom(
          at + 1,
          count,
          (j) => params[j](frame),
          (j, v) => {
            args[j] = v;
          }
        );
        const done = () => unwrap(applyCall(plan, helper2, name, frame, args, count, fn, inverse));
        return rest ? rest.promise.then(done) : done();
      }));
    }
    args[i] = value;
  }
  return applyCall(plan, helper2, name, frame, args, count, fn, inverse);
}
function applyCall(plan, helper2, name, frame, args, count, fn, inverse) {
  if (!plan.hashKeys.length) {
    args[count] = buildHelperOptions(name, {}, frame, fn, inverse);
    return invoked(helper2.apply(frame.context, args));
  }
  return chain(runHash(plan, frame), (hash) => {
    args[count] = buildHelperOptions(name, hash, frame, fn, inverse);
    return invoked(helper2.apply(frame.context, args));
  });
}
function buildLookup(plan) {
  return (frame) => {
    const value = resolvePlan(plan, frame);
    const lambda = asCallable(value);
    return lambda ? invoked(lambda.call(frame.context)) : value;
  };
}
function buildValue(node, scopes) {
  switch (node.type) {
    case "PathExpression":
      return buildLookup(planPath(node, scopes));
    case "SubExpression":
      return buildExpression(node, scopes);
    case "StringLiteral":
    case "NumberLiteral":
    case "BooleanLiteral": {
      const value = node.value;
      return () => value;
    }
    case "UndefinedLiteral":
      return () => void 0;
    case "NullLiteral":
      return () => null;
    default:
      return () => {
        throw new exception_default("Unknown value type: " + node.type, node);
      };
  }
}
function buildSubExpressionCall(path, call, scopes) {
  const inner = buildExpression(path, scopes);
  const original = path.path?.original;
  return (frame) => chain(inner(frame), (helperFn) => {
    const helper2 = asCallable(helperFn);
    if (!helper2) {
      throw new exception_default(
        "The path " + original + " did not return a function",
        path
      );
    }
    return runCall(call, helper2, null, frame);
  });
}
function buildCall(plan, call, name) {
  return (frame) => {
    if (name) {
      const helper2 = lookupHelper(frame, name);
      if (helper2) {
        return runCall(call, helper2, name, frame);
      }
    }
    const contextValue = resolvePlan(plan, frame);
    const callable = asCallable(contextValue);
    if (callable) {
      return runCall(call, callable, name, frame);
    }
    if (contextValue != null) {
      throw new exception_default(
        '"' + (name || plan.original) + '" is not a function',
        plan.node
      );
    }
    return runCall(
      call,
      missingHelper(frame, "helperMissing"),
      name || plan.original,
      frame
    );
  };
}
function buildAmbiguous(plan, name) {
  return (frame) => {
    const helper2 = lookupHelper(frame, name);
    if (helper2) {
      return runCall(noArgs, helper2, name, frame);
    }
    const value = resolvePlan(plan, frame);
    const lambda = asCallable(value);
    if (lambda) {
      return invoked(lambda.call(frame.context, buildHelperOptions(name, {}, frame)));
    }
    if (value == null) {
      return runCall(noArgs, missingHelper(frame, "helperMissing"), name, frame);
    }
    return value;
  };
}
function buildExpression(node, scopes) {
  const rawPath = normalizePath(node.path);
  const call = planCall(node.params || [], node.hash, scopes);
  if (rawPath.type === "SubExpression") {
    return buildSubExpressionCall(rawPath, call, scopes);
  }
  const plan = planPath(rawPath, scopes);
  const isBlockParam = plan.simple && plan.blockParam !== null;
  const name = plan.simple ? plan.parts[0] : null;
  if (ast_default.helpers.helperExpression(node) && !isBlockParam) {
    return buildCall(plan, call, name);
  }
  if (plan.simple && !isBlockParam) {
    return buildAmbiguous(plan, name);
  }
  return buildLookup(plan);
}
var noArgs = { params: [], hashKeys: [], hashValues: [] };
var sawDepthedPath = false;
var builtPrograms = /* @__PURE__ */ new WeakMap();
function foldContent(body) {
  let text = "";
  for (const node of body) {
    if (node.type === "ContentStatement") {
      text += node.value;
    } else if (node.type !== "CommentStatement") {
      return null;
    }
  }
  return text;
}
function buildRender(body, scopes, inlines) {
  const children = [];
  let text = "";
  const flushText = () => {
    if (text) {
      const value = text;
      children.push(() => value);
      text = "";
    }
  };
  for (const node of body) {
    if (node.type === "ContentStatement") {
      text += node.value;
      continue;
    }
    const child = buildStatement(node, scopes);
    if (!child) {
      continue;
    }
    flushText();
    children.push(child);
  }
  flushText();
  const renderBody = (frame) => renderAll(children, frame);
  return inlines.length ? (frame) => renderBody(withInlinePartials(frame, inlines)) : renderBody;
}
function buildProgram(program, outerScopes) {
  const cached = builtPrograms.get(program);
  if (cached) {
    sawDepthedPath = sawDepthedPath || cached.usesDepths;
    return cached;
  }
  const outerSaw = sawDepthedPath;
  sawDepthedPath = false;
  const scopes = program.blockParams && program.blockParams.length ? [program.blockParams, ...outerScopes] : outerScopes;
  const inlines = buildInlineDefinitions(program, scopes);
  const body = program.body || [];
  const folded = inlines.length ? null : foldContent(body);
  const render = folded !== null ? () => folded : buildRender(body, scopes, inlines);
  const usesDepths = sawDepthedPath;
  sawDepthedPath = outerSaw || usesDepths;
  const built = { render, inlines, usesDepths };
  builtPrograms.set(program, built);
  return built;
}
function buildInlineDefinitions(program, scopes) {
  if (!program || !program.body) {
    return [];
  }
  const definitions = [];
  for (const node of program.body) {
    if (node.type !== "DecoratorBlock" || node.path.original !== "inline") {
      continue;
    }
    const decorator = node;
    const nameNode = decorator.params[0];
    if (!nameNode || nameNode.type !== "StringLiteral") {
      throw new exception_default("Inline partial names must be string literals", decorator);
    }
    definitions.push({
      name: nameNode.value,
      body: buildProgram(decorator.program, scopes).render
    });
  }
  return definitions;
}
function withInlinePartials(frame, inlines) {
  const partials = { ...frame.partials };
  for (const inline of inlines) {
    partials[inline.name] = ((ctx, opts = {}) => settle(inline.body(derive(
      frame,
      ctx,
      opts.data || frame.data,
      frame.depths,
      opts.partials ? { ...partials, ...opts.partials } : partials,
      frame.blockParamValues
    ))));
  }
  return derive(
    frame,
    frame.context,
    frame.data,
    frame.depths,
    partials,
    frame.blockParamValues
  );
}
function restorePartialBlock(data, frame) {
  const captured = frame.data ? frame.data["partial-block"] : void 0;
  if (data === frame.data || !data || data["partial-block"] === captured) {
    return data;
  }
  const restored = createFrame(data);
  restored["partial-block"] = captured;
  return restored;
}
function buildProgramFn(program, scopes) {
  const built = buildProgram(program, scopes);
  const declared = program.blockParams ? program.blockParams.length : 0;
  const usesDepths = built.usesDepths;
  return (frame) => {
    const fn = ((context, fnOptions = {}) => {
      const blockParamValues = declared ? [fnOptions.blockParams || emptyValues, ...frame.blockParamValues] : frame.blockParamValues;
      const data = restorePartialBlock(fnOptions.data || frame.data, frame);
      return settle(built.render(derive(
        frame,
        context,
        data,
        // loose, matching wrapProgram upstream. It matters: iterating a one
        // element array binds the item, and `1 != [1]` is false, so upstream
        // pushes no level there and every `../` below counts one less.
        usesDepths && context != frame.depths[0] ? [context, ...frame.depths] : frame.depths,
        frame.partials,
        blockParamValues
      )));
    });
    fn.blockParams = declared;
    return fn;
  };
}
function buildStatement(node, scopes) {
  switch (node.type) {
    case "MustacheStatement":
      return buildMustache(node, scopes);
    case "BlockStatement":
      return buildBlock(node, scopes);
    case "PartialStatement": {
      const plan = planPartial(node, scopes);
      return (frame) => runPartial(plan, frame);
    }
    case "PartialBlockStatement":
      return buildPartialBlock(node, scopes);
    case "DecoratorBlock":
    case "Decorator":
    case "CommentStatement":
      return null;
    default:
      return () => {
        throw new exception_default(
          "Unknown node type: " + node.type,
          node
        );
      };
  }
}
function buildMustache(node, scopes) {
  const value = buildExpression(node, scopes);
  if (node.escaped) {
    return (frame) => {
      const result = value(frame);
      return result instanceof Pending ? new Pending(result.promise.then(escapeExpression2)) : escapeExpression2(result);
    };
  }
  return (frame) => {
    const result = value(frame);
    return result instanceof Pending ? new Pending(result.promise.then(stringify)) : stringify(result);
  };
}
function stringify(value) {
  return value != null ? String(value) : "";
}
function runImplicitBlock(block, frame, resolved, fn, inverse) {
  return chain(runHash(block.call, frame), (hash) => {
    const options = buildHelperOptions(
      block.name,
      hash,
      frame,
      fn,
      inverse
    );
    const lambda = asCallable(resolved);
    const lambdaResult = lambda ? invoked(block.ambiguous ? lambda.call(frame.context, options) : lambda.call(frame.context)) : resolved;
    return chain(lambdaResult, (result) => invoked(
      missingHelper(frame, "blockHelperMissing").call(frame.context, result, options)
    ));
  });
}
function buildBlock(node, scopes) {
  const rawPath = normalizePath(
    node.path
  );
  const plan = planPath(rawPath, scopes);
  const isBlockParam = plan.simple && plan.blockParam !== null;
  const hasParams = !isBlockParam && ast_default.helpers.helperExpression(node);
  const block = {
    plan,
    call: planCall(node.params, node.hash, scopes),
    // the grammar rejects a subexpression here and normalizePath rewrote any
    // literal, so the path is always a PathExpression and always has a name
    name: plan.original,
    ambiguous: plan.simple && !isBlockParam
  };
  const makeFn = node.program ? buildProgramFn(node.program, scopes) : null;
  const makeInverse = node.inverse ? buildProgramFn(node.inverse, scopes) : null;
  return (frame) => {
    const fn = makeFn ? makeFn(frame) : noopProgram;
    const inverse = makeInverse ? makeInverse(frame) : noopProgram;
    const helper2 = block.ambiguous ? lookupHelper(frame, block.name) : void 0;
    let result;
    if (helper2) {
      result = runCall(block.call, helper2, block.name, frame, fn, inverse);
    } else {
      const resolved = resolvePlan(plan, frame);
      result = hasParams ? runCall(
        block.call,
        asCallable(resolved) || missingHelper(frame, "helperMissing"),
        block.name,
        frame,
        fn,
        inverse
      ) : runImplicitBlock(block, frame, resolved, fn, inverse);
    }
    return result instanceof Pending ? new Pending(result.promise.then(stringify)) : stringify(result);
  };
}
function nativeEach(...args) {
  const context = args[0];
  const options = asHelperOptions(args[1]);
  if (!options) {
    throw new exception_default("Must pass iterator to #each");
  }
  const fn = options.fn || noopProgram;
  const inverse = options.inverse || noopProgram;
  const iterable = asCallable(context);
  return chain(
    iterable ? invoked(iterable.call(this)) : context,
    (resolved) => eachOver(resolved, this, options.data, fn, inverse)
  );
}
var alwaysPresent = () => true;
function walker(context, count, fieldAt, valueAt, present = alwaysPresent) {
  return { context, count, fieldAt, valueAt, present };
}
function walkerFor(context) {
  if (!context || typeof context !== "object") {
    return null;
  }
  if (isMap2(context)) {
    const entries = [...context];
    return walker(context, entries.length, (i) => entries[i][0], (i) => entries[i][1]);
  }
  if (isSet2(context)) {
    const values = [...context];
    return walker(context, values.length, (i) => i, (i) => values[i]);
  }
  if (isArray(context) || context[Symbol.iterator]) {
    const arr = isArray(context) ? context : Array.from(context);
    return walker(arr, arr.length, (i) => i, (i) => arr[i], (i) => i in arr);
  }
  const obj = context;
  const keys = Object.keys(obj);
  return walker(context, keys.length, (i) => keys[i], (i) => obj[keys[i]]);
}
function eachOver(context, self, parentData, fn, inverse) {
  const walker2 = walkerFor(context);
  if (!walker2 || walker2.count === 0) {
    return chain(invoked(inverse(self)), stringify);
  }
  const count = walker2.count;
  const data = createFrame(parentData);
  const wantsBlockParams = !!fn.blockParams;
  const iterOptions = wantsBlockParams ? { data, blockParams: void 0 } : { data };
  let ret = "";
  const step = (i) => {
    if (!walker2.present(i)) {
      return "";
    }
    const field = walker2.fieldAt(i);
    data.key = field;
    data.index = i;
    data.first = i === 0;
    data.last = i === count - 1;
    if (wantsBlockParams) {
      iterOptions.blockParams = [
        walker2.context[field],
        field
      ];
    }
    return invoked(fn(walker2.valueAt(i), iterOptions));
  };
  const pending = runFrom(0, count, step, (_i, piece) => {
    ret += piece || "";
  });
  return pending ? new Pending(pending.promise.then(() => ret)) : ret;
}
var sourceCacheLimit = 64 * 1024;
var sourceCache = /* @__PURE__ */ new Map();
var sourceCacheChars = 0;
function cachedParse(source) {
  const cached = sourceCache.get(source);
  if (cached) {
    sourceCache.delete(source);
    sourceCache.set(source, cached);
    return cached;
  }
  const entry = { ast: parse(source) };
  sourceCache.set(source, entry);
  sourceCacheChars += source.length;
  while (sourceCacheChars > sourceCacheLimit && sourceCache.size > 1) {
    const oldest = sourceCache.keys().next().value;
    sourceCache.delete(oldest);
    sourceCacheChars -= oldest.length;
  }
  return entry;
}
function compileStringPartial(source) {
  const entry = cachedParse(source);
  if (!entry.fn) {
    const ast = entry.ast;
    entry.fn = (context, options = {}) => briskbars(ast, context, options);
  }
  return entry.fn;
}
function planPartial(node, scopes) {
  const nameNode = node.name;
  const params = node.params || [];
  const dynamic = nameNode.type === "SubExpression";
  return {
    node,
    nameFn: dynamic ? buildExpression(nameNode, scopes) : null,
    staticName: dynamic ? "" : String(nameNode.original),
    paramCount: params.length,
    contextFn: params.length > 0 ? buildValue(params[0], scopes) : null,
    hash: planCall(void 0, node.hash, scopes),
    hasHash: !!node.hash,
    indent: node.indent || ""
  };
}
function findPartial(partials, name) {
  return Object.prototype.hasOwnProperty.call(partials, name) ? partials[name] : void 0;
}
function resolvePartialFn(frame, partialName) {
  let partial = partialName === "@partial-block" ? frame.data && frame.data["partial-block"] : findPartial(frame.partials, partialName);
  if (typeof partial === "string") {
    try {
      partial = compileStringPartial(partial);
    } catch (err) {
      const detail = err instanceof Error ? err.message : String(err);
      const exception = new exception_default(
        "The partial " + partialName + " could not be compiled: " + detail
      );
      exception.cause = err;
      throw exception;
    }
  }
  if (!partial) {
    throw new exception_default('The partial "' + partialName + '" could not be found');
  }
  return partial;
}
function callPartial(plan, frame, partialFn) {
  return chain(
    plan.contextFn ? plan.contextFn(frame) : frame.context,
    (context) => chain(plan.hasHash ? runHash(plan.hash, frame) : null, (hash) => {
      const target = hash ? extend2({}, context, hash) : context;
      const callOpts = {
        ...frame.options,
        helpers: frame.helpers,
        partials: frame.partials,
        data: frame.data
      };
      return chain(invoked(partialFn(target, callOpts)), (result) => indentResult(result || "", plan.indent));
    })
  );
}
function runPartial(plan, frame, resolvedName) {
  const named = (partialName) => {
    if (plan.paramCount > 1) {
      throw new exception_default(
        "Unsupported number of partial arguments: " + plan.paramCount,
        plan.node
      );
    }
    return callPartial(plan, frame, resolvePartialFn(frame, partialName));
  };
  if (resolvedName !== void 0) {
    return named(resolvedName);
  }
  if (!plan.nameFn) {
    return named(plan.staticName);
  }
  return chain(plan.nameFn(frame), (name) => named(name));
}
function indentResult(result, indent) {
  if (!indent || !result) {
    return result;
  }
  return indent + result.replace(/\n(?!$)/g, "\n" + indent);
}
function partialBlockFrame(frame, fn, inlines) {
  const data = createFrame(frame.data);
  data["partial-block"] = fn;
  const partials = inlines.length ? withInlinePartials(frame, inlines).partials : frame.partials;
  return derive(
    frame,
    frame.context,
    data,
    frame.depths,
    partials,
    frame.blockParamValues
  );
}
function renderDefaultBlock(plan, frame, fn) {
  return chain(
    plan.contextFn ? plan.contextFn(frame) : frame.context,
    (context) => chain(
      invoked(fn(context, { data: frame.data })),
      (result) => result || ""
    )
  );
}
function buildPartialBlock(node, scopes) {
  const plan = planPartial(node, scopes);
  const makeFn = node.program ? buildProgramFn(node.program, scopes) : null;
  const blockInlines = node.program ? buildInlineDefinitions(node.program, scopes) : [];
  const partialName = plan.staticName;
  return (frame) => {
    const fn = makeFn ? makeFn(frame) : noopProgram;
    const childFrame = partialBlockFrame(frame, fn, blockInlines);
    const exists = partialName !== "@partial-block" && findPartial(childFrame.partials, partialName) !== void 0;
    return exists ? runPartial(plan, childFrame, partialName) : renderDefaultBlock(plan, frame, fn);
  };
}
function initData(context, data) {
  if (!data || typeof data !== "object" || !("root" in data)) {
    data = data && typeof data === "object" ? createFrame(data) : {};
    data.root = context;
  }
  return data;
}
function briskbars(template, context, runtimeOptions = {}) {
  if (template == null || typeof template !== "string" && template.type !== "Program") {
    throw new exception_default(
      "You must pass a string or Handlebars AST. You passed " + template
    );
  }
  const ast = typeof template === "string" ? cachedParse(template).ast : template;
  const built = buildProgram(ast, emptyScopes);
  const data = initData(context, runtimeOptions.data);
  const helpers = runtimeOptions.helpers || emptyHelpers;
  const partials = runtimeOptions.partials || emptyPartials;
  return settle(built.render({
    context,
    data,
    depths: [context],
    helpers,
    partials,
    blockParamValues: [],
    lookupProperty: defaultLookupProperty,
    options: runtimeOptions
  }));
}
export {
  safe_string_default as SafeString,
  briskbars as default,
  escapeExpression2 as escapeExpression,
  parse
};
//# sourceMappingURL=briskbars.js.map
