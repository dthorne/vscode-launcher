/******/ (() => { // webpackBootstrap
/******/ 	var __webpack_modules__ = ({

/***/ "./node_modules/figlet/lib/figlet.js":
/*!*******************************************!*\
  !*** ./node_modules/figlet/lib/figlet.js ***!
  \*******************************************/
/***/ ((module) => {

"use strict";
/*
    FIGlet.js (a FIGDriver for FIGlet fonts)
    Written by https://github.com/patorjk/figlet.js/graphs/contributors
    Originally Written For: http://patorjk.com/software/taag/
    License: MIT (with this header staying intact)

    This JavaScript code aims to fully implement the FIGlet spec.
    Full FIGlet spec: http://patorjk.com/software/taag/docs/figfont.txt

    FIGlet fonts are actually kind of complex, which is why you will see
    a lot of code about parsing and interpreting rules. The actual generation
    code is pretty simple and is done near the bottom of the code.
*/



const figlet = (() => {
  // ---------------------------------------------------------------------
  // Private static variables

  const FULL_WIDTH = 0,
    FITTING = 1,
    SMUSHING = 2,
    CONTROLLED_SMUSHING = 3;

  // ---------------------------------------------------------------------
  // Variable that will hold information about the fonts

  const figFonts = {}; // What stores all of the FIGlet font data
  const figDefaults = {
    font: "Standard",
    fontPath: "./fonts",
  };

  // ---------------------------------------------------------------------
  // Private static methods

  /*
        This method takes in the oldLayout and newLayout data from the FIGfont header file and returns
        the layout information.
    */
  function getSmushingRules(oldLayout, newLayout) {
    let rules = {};
    let val, index, len, code;
    let codes = [
      [16384, "vLayout", SMUSHING],
      [8192, "vLayout", FITTING],
      [4096, "vRule5", true],
      [2048, "vRule4", true],
      [1024, "vRule3", true],
      [512, "vRule2", true],
      [256, "vRule1", true],
      [128, "hLayout", SMUSHING],
      [64, "hLayout", FITTING],
      [32, "hRule6", true],
      [16, "hRule5", true],
      [8, "hRule4", true],
      [4, "hRule3", true],
      [2, "hRule2", true],
      [1, "hRule1", true],
    ];

    val = newLayout !== null ? newLayout : oldLayout;
    index = 0;
    len = codes.length;
    while (index < len) {
      code = codes[index];
      if (val >= code[0]) {
        val = val - code[0];
        rules[code[1]] =
          typeof rules[code[1]] === "undefined" ? code[2] : rules[code[1]];
      } else if (code[1] !== "vLayout" && code[1] !== "hLayout") {
        rules[code[1]] = false;
      }
      index++;
    }

    if (typeof rules["hLayout"] === "undefined") {
      if (oldLayout === 0) {
        rules["hLayout"] = FITTING;
      } else if (oldLayout === -1) {
        rules["hLayout"] = FULL_WIDTH;
      } else {
        if (
          rules["hRule1"] ||
          rules["hRule2"] ||
          rules["hRule3"] ||
          rules["hRule4"] ||
          rules["hRule5"] ||
          rules["hRule6"]
        ) {
          rules["hLayout"] = CONTROLLED_SMUSHING;
        } else {
          rules["hLayout"] = SMUSHING;
        }
      }
    } else if (rules["hLayout"] === SMUSHING) {
      if (
        rules["hRule1"] ||
        rules["hRule2"] ||
        rules["hRule3"] ||
        rules["hRule4"] ||
        rules["hRule5"] ||
        rules["hRule6"]
      ) {
        rules["hLayout"] = CONTROLLED_SMUSHING;
      }
    }

    if (typeof rules["vLayout"] === "undefined") {
      if (
        rules["vRule1"] ||
        rules["vRule2"] ||
        rules["vRule3"] ||
        rules["vRule4"] ||
        rules["vRule5"]
      ) {
        rules["vLayout"] = CONTROLLED_SMUSHING;
      } else {
        rules["vLayout"] = FULL_WIDTH;
      }
    } else if (rules["vLayout"] === SMUSHING) {
      if (
        rules["vRule1"] ||
        rules["vRule2"] ||
        rules["vRule3"] ||
        rules["vRule4"] ||
        rules["vRule5"]
      ) {
        rules["vLayout"] = CONTROLLED_SMUSHING;
      }
    }

    return rules;
  }

  /* The [vh]Rule[1-6]_Smush functions return the smushed character OR false if the two characters can't be smushed */

  /*
        Rule 1: EQUAL CHARACTER SMUSHING (code value 1)

            Two sub-characters are smushed into a single sub-character
            if they are the same.  This rule does not smush
            hardblanks.  (See rule 6 on hardblanks below)
    */
  function hRule1_Smush(ch1, ch2, hardBlank) {
    if (ch1 === ch2 && ch1 !== hardBlank) {
      return ch1;
    }
    return false;
  }

  /*
        Rule 2: UNDERSCORE SMUSHING (code value 2)

            An underscore ("_") will be replaced by any of: "|", "/",
            "\", "[", "]", "{", "}", "(", ")", "<" or ">".
    */
  function hRule2_Smush(ch1, ch2) {
    let rule2Str = "|/\\[]{}()<>";
    if (ch1 === "_") {
      if (rule2Str.indexOf(ch2) !== -1) {
        return ch2;
      }
    } else if (ch2 === "_") {
      if (rule2Str.indexOf(ch1) !== -1) {
        return ch1;
      }
    }
    return false;
  }

  /*
        Rule 3: HIERARCHY SMUSHING (code value 4)

            A hierarchy of six classes is used: "|", "/\", "[]", "{}",
            "()", and "<>".  When two smushing sub-characters are
            from different classes, the one from the latter class
            will be used.
    */
  function hRule3_Smush(ch1, ch2) {
    let rule3Classes = "| /\\ [] {} () <>";
    let r3_pos1 = rule3Classes.indexOf(ch1);
    let r3_pos2 = rule3Classes.indexOf(ch2);
    if (r3_pos1 !== -1 && r3_pos2 !== -1) {
      if (r3_pos1 !== r3_pos2 && Math.abs(r3_pos1 - r3_pos2) !== 1) {
        const startPos = Math.max(r3_pos1, r3_pos2);
        const endPos = startPos + 1;
        return rule3Classes.substring(startPos, endPos);
      }
    }
    return false;
  }

  /*
        Rule 4: OPPOSITE PAIR SMUSHING (code value 8)

            Smushes opposing brackets ("[]" or "]["), braces ("{}" or
            "}{") and parentheses ("()" or ")(") together, replacing
            any such pair with a vertical bar ("|").
    */
  function hRule4_Smush(ch1, ch2) {
    let rule4Str = "[] {} ()";
    let r4_pos1 = rule4Str.indexOf(ch1);
    let r4_pos2 = rule4Str.indexOf(ch2);
    if (r4_pos1 !== -1 && r4_pos2 !== -1) {
      if (Math.abs(r4_pos1 - r4_pos2) <= 1) {
        return "|";
      }
    }
    return false;
  }

  /*
        Rule 5: BIG X SMUSHING (code value 16)

            Smushes "/\" into "|", "\/" into "Y", and "><" into "X".
            Note that "<>" is not smushed in any way by this rule.
            The name "BIG X" is historical; originally all three pairs
            were smushed into "X".
    */
  function hRule5_Smush(ch1, ch2) {
    let rule5Str = "/\\ \\/ ><";
    let rule5Hash = { 0: "|", 3: "Y", 6: "X" };
    let r5_pos1 = rule5Str.indexOf(ch1);
    let r5_pos2 = rule5Str.indexOf(ch2);
    if (r5_pos1 !== -1 && r5_pos2 !== -1) {
      if (r5_pos2 - r5_pos1 === 1) {
        return rule5Hash[r5_pos1];
      }
    }
    return false;
  }

  /*
        Rule 6: HARDBLANK SMUSHING (code value 32)

            Smushes two hardblanks together, replacing them with a
            single hardblank.  (See "Hardblanks" below.)
    */
  function hRule6_Smush(ch1, ch2, hardBlank) {
    if (ch1 === hardBlank && ch2 === hardBlank) {
      return hardBlank;
    }
    return false;
  }

  /*
        Rule 1: EQUAL CHARACTER SMUSHING (code value 256)

            Same as horizontal smushing rule 1.
    */
  function vRule1_Smush(ch1, ch2) {
    if (ch1 === ch2) {
      return ch1;
    }
    return false;
  }

  /*
        Rule 2: UNDERSCORE SMUSHING (code value 512)

            Same as horizontal smushing rule 2.
    */
  function vRule2_Smush(ch1, ch2) {
    let rule2Str = "|/\\[]{}()<>";
    if (ch1 === "_") {
      if (rule2Str.indexOf(ch2) !== -1) {
        return ch2;
      }
    } else if (ch2 === "_") {
      if (rule2Str.indexOf(ch1) !== -1) {
        return ch1;
      }
    }
    return false;
  }

  /*
        Rule 3: HIERARCHY SMUSHING (code value 1024)

            Same as horizontal smushing rule 3.
    */
  function vRule3_Smush(ch1, ch2) {
    let rule3Classes = "| /\\ [] {} () <>";
    let r3_pos1 = rule3Classes.indexOf(ch1);
    let r3_pos2 = rule3Classes.indexOf(ch2);
    if (r3_pos1 !== -1 && r3_pos2 !== -1) {
      if (r3_pos1 !== r3_pos2 && Math.abs(r3_pos1 - r3_pos2) !== 1) {
        const startPos = Math.max(r3_pos1, r3_pos2);
        const endPos = startPos + 1;
        return rule3Classes.substring(startPos, endPos);
      }
    }
    return false;
  }

  /*
        Rule 4: HORIZONTAL LINE SMUSHING (code value 2048)

            Smushes stacked pairs of "-" and "_", replacing them with
            a single "=" sub-character.  It does not matter which is
            found above the other.  Note that vertical smushing rule 1
            will smush IDENTICAL pairs of horizontal lines, while this
            rule smushes horizontal lines consisting of DIFFERENT
            sub-characters.
    */
  function vRule4_Smush(ch1, ch2) {
    if ((ch1 === "-" && ch2 === "_") || (ch1 === "_" && ch2 === "-")) {
      return "=";
    }
    return false;
  }

  /*
        Rule 5: VERTICAL LINE SUPERSMUSHING (code value 4096)

            This one rule is different from all others, in that it
            "supersmushes" vertical lines consisting of several
            vertical bars ("|").  This creates the illusion that
            FIGcharacters have slid vertically against each other.
            Supersmushing continues until any sub-characters other
            than "|" would have to be smushed.  Supersmushing can
            produce impressive results, but it is seldom possible,
            since other sub-characters would usually have to be
            considered for smushing as soon as any such stacked
            vertical lines are encountered.
    */
  function vRule5_Smush(ch1, ch2) {
    if (ch1 === "|" && ch2 === "|") {
      return "|";
    }
    return false;
  }

  /*
        Universal smushing simply overrides the sub-character from the
        earlier FIGcharacter with the sub-character from the later
        FIGcharacter.  This produces an "overlapping" effect with some
        FIGfonts, wherin the latter FIGcharacter may appear to be "in
        front".
    */
  function uni_Smush(ch1, ch2, hardBlank) {
    if (ch2 === " " || ch2 === "") {
      return ch1;
    } else if (ch2 === hardBlank && ch1 !== " ") {
      return ch1;
    } else {
      return ch2;
    }
  }

  // --------------------------------------------------------------------------
  // main vertical smush routines (excluding rules)

  /*
        txt1 - A line of text
        txt2 - A line of text
        opts - FIGlet options array

        About: Takes in two lines of text and returns one of the following:
        "valid" - These lines can be smushed together given the current smushing rules
        "end" - The lines can be smushed, but we're at a stopping point
        "invalid" - The two lines cannot be smushed together
    */
  function canVerticalSmush(txt1, txt2, opts) {
    if (opts.fittingRules.vLayout === FULL_WIDTH) {
      return "invalid";
    }
    let ii,
      len = Math.min(txt1.length, txt2.length),
      ch1,
      ch2,
      endSmush = false,
      validSmush;
    if (len === 0) {
      return "invalid";
    }

    for (ii = 0; ii < len; ii++) {
      ch1 = txt1.substring(ii, ii + 1);
      ch2 = txt2.substring(ii, ii + 1);
      if (ch1 !== " " && ch2 !== " ") {
        if (opts.fittingRules.vLayout === FITTING) {
          return "invalid";
        } else if (opts.fittingRules.vLayout === SMUSHING) {
          return "end";
        } else {
          if (vRule5_Smush(ch1, ch2)) {
            endSmush = endSmush || false;
            continue;
          } // rule 5 allow for "super" smushing, but only if we're not already ending this smush
          validSmush = false;
          validSmush = opts.fittingRules.vRule1
            ? vRule1_Smush(ch1, ch2)
            : validSmush;
          validSmush =
            !validSmush && opts.fittingRules.vRule2
              ? vRule2_Smush(ch1, ch2)
              : validSmush;
          validSmush =
            !validSmush && opts.fittingRules.vRule3
              ? vRule3_Smush(ch1, ch2)
              : validSmush;
          validSmush =
            !validSmush && opts.fittingRules.vRule4
              ? vRule4_Smush(ch1, ch2)
              : validSmush;
          endSmush = true;
          if (!validSmush) {
            return "invalid";
          }
        }
      }
    }
    if (endSmush) {
      return "end";
    } else {
      return "valid";
    }
  }

  function getVerticalSmushDist(lines1, lines2, opts) {
    let maxDist = lines1.length;
    let len1 = lines1.length;
    let len2 = lines2.length;
    let subLines1, subLines2, slen;
    let curDist = 1;
    let ii, ret, result;
    while (curDist <= maxDist) {
      subLines1 = lines1.slice(Math.max(0, len1 - curDist), len1);
      subLines2 = lines2.slice(0, Math.min(maxDist, curDist));

      slen = subLines2.length; //TODO:check this
      result = "";
      for (ii = 0; ii < slen; ii++) {
        ret = canVerticalSmush(subLines1[ii], subLines2[ii], opts);
        if (ret === "end") {
          result = ret;
        } else if (ret === "invalid") {
          result = ret;
          break;
        } else {
          if (result === "") {
            result = "valid";
          }
        }
      }

      if (result === "invalid") {
        curDist--;
        break;
      }
      if (result === "end") {
        break;
      }
      if (result === "valid") {
        curDist++;
      }
    }

    return Math.min(maxDist, curDist);
  }

  function verticallySmushLines(line1, line2, opts) {
    let ii,
      len = Math.min(line1.length, line2.length);
    let ch1,
      ch2,
      result = "",
      validSmush;

    for (ii = 0; ii < len; ii++) {
      ch1 = line1.substring(ii, ii + 1);
      ch2 = line2.substring(ii, ii + 1);
      if (ch1 !== " " && ch2 !== " ") {
        if (opts.fittingRules.vLayout === FITTING) {
          result += uni_Smush(ch1, ch2);
        } else if (opts.fittingRules.vLayout === SMUSHING) {
          result += uni_Smush(ch1, ch2);
        } else {
          validSmush = false;
          validSmush = opts.fittingRules.vRule5
            ? vRule5_Smush(ch1, ch2)
            : validSmush;
          validSmush =
            !validSmush && opts.fittingRules.vRule1
              ? vRule1_Smush(ch1, ch2)
              : validSmush;
          validSmush =
            !validSmush && opts.fittingRules.vRule2
              ? vRule2_Smush(ch1, ch2)
              : validSmush;
          validSmush =
            !validSmush && opts.fittingRules.vRule3
              ? vRule3_Smush(ch1, ch2)
              : validSmush;
          validSmush =
            !validSmush && opts.fittingRules.vRule4
              ? vRule4_Smush(ch1, ch2)
              : validSmush;
          result += validSmush;
        }
      } else {
        result += uni_Smush(ch1, ch2);
      }
    }
    return result;
  }

  function verticalSmush(lines1, lines2, overlap, opts) {
    let len1 = lines1.length;
    let len2 = lines2.length;
    let piece1 = lines1.slice(0, Math.max(0, len1 - overlap));
    let piece2_1 = lines1.slice(Math.max(0, len1 - overlap), len1);
    let piece2_2 = lines2.slice(0, Math.min(overlap, len2));
    let ii,
      len,
      line,
      piece2 = [],
      piece3,
      result = [];

    len = piece2_1.length;
    for (ii = 0; ii < len; ii++) {
      if (ii >= len2) {
        line = piece2_1[ii];
      } else {
        line = verticallySmushLines(piece2_1[ii], piece2_2[ii], opts);
      }
      piece2.push(line);
    }

    piece3 = lines2.slice(Math.min(overlap, len2), len2);

    return result.concat(piece1, piece2, piece3);
  }

  function padLines(lines, numSpaces) {
    let ii,
      len = lines.length,
      padding = "";
    for (ii = 0; ii < numSpaces; ii++) {
      padding += " ";
    }
    for (ii = 0; ii < len; ii++) {
      lines[ii] += padding;
    }
  }

  function smushVerticalFigLines(output, lines, opts) {
    let len1 = output[0].length;
    let len2 = lines[0].length;
    let overlap;
    if (len1 > len2) {
      padLines(lines, len1 - len2);
    } else if (len2 > len1) {
      padLines(output, len2 - len1);
    }
    overlap = getVerticalSmushDist(output, lines, opts);
    return verticalSmush(output, lines, overlap, opts);
  }

  // -------------------------------------------------------------------------
  // Main horizontal smush routines (excluding rules)

  function getHorizontalSmushLength(txt1, txt2, opts) {
    if (opts.fittingRules.hLayout === FULL_WIDTH) {
      return 0;
    }
    let ii,
      len1 = txt1.length,
      len2 = txt2.length;
    let maxDist = len1;
    let curDist = 1;
    let breakAfter = false;
    let validSmush = false;
    let seg1, seg2, ch1, ch2;
    if (len1 === 0) {
      return 0;
    }

    distCal: while (curDist <= maxDist) {
      const seg1StartPos = len1 - curDist;
      seg1 = txt1.substring(seg1StartPos, seg1StartPos + curDist);
      seg2 = txt2.substring(0, Math.min(curDist, len2));
      for (ii = 0; ii < Math.min(curDist, len2); ii++) {
        ch1 = seg1.substring(ii, ii + 1);
        ch2 = seg2.substring(ii, ii + 1);
        if (ch1 !== " " && ch2 !== " ") {
          if (opts.fittingRules.hLayout === FITTING) {
            curDist = curDist - 1;
            break distCal;
          } else if (opts.fittingRules.hLayout === SMUSHING) {
            if (ch1 === opts.hardBlank || ch2 === opts.hardBlank) {
              curDist = curDist - 1; // universal smushing does not smush hardblanks
            }
            break distCal;
          } else {
            breakAfter = true; // we know we need to break, but we need to check if our smushing rules will allow us to smush the overlapped characters
            validSmush = false; // the below checks will let us know if we can smush these characters

            validSmush = opts.fittingRules.hRule1
              ? hRule1_Smush(ch1, ch2, opts.hardBlank)
              : validSmush;
            validSmush =
              !validSmush && opts.fittingRules.hRule2
                ? hRule2_Smush(ch1, ch2, opts.hardBlank)
                : validSmush;
            validSmush =
              !validSmush && opts.fittingRules.hRule3
                ? hRule3_Smush(ch1, ch2, opts.hardBlank)
                : validSmush;
            validSmush =
              !validSmush && opts.fittingRules.hRule4
                ? hRule4_Smush(ch1, ch2, opts.hardBlank)
                : validSmush;
            validSmush =
              !validSmush && opts.fittingRules.hRule5
                ? hRule5_Smush(ch1, ch2, opts.hardBlank)
                : validSmush;
            validSmush =
              !validSmush && opts.fittingRules.hRule6
                ? hRule6_Smush(ch1, ch2, opts.hardBlank)
                : validSmush;

            if (!validSmush) {
              curDist = curDist - 1;
              break distCal;
            }
          }
        }
      }
      if (breakAfter) {
        break;
      }
      curDist++;
    }
    return Math.min(maxDist, curDist);
  }

  function horizontalSmush(textBlock1, textBlock2, overlap, opts) {
    let ii,
      jj,
      outputFig = [],
      overlapStart,
      piece1,
      piece2,
      piece3,
      len1,
      len2,
      txt1,
      txt2;

    for (ii = 0; ii < opts.height; ii++) {
      txt1 = textBlock1[ii];
      txt2 = textBlock2[ii];
      len1 = txt1.length;
      len2 = txt2.length;
      overlapStart = len1 - overlap;
      piece1 = txt1.substr(0, Math.max(0, overlapStart));
      piece2 = "";

      // determine overlap piece
      const seg1StartPos = Math.max(0, len1 - overlap);
      var seg1 = txt1.substring(seg1StartPos, seg1StartPos + overlap);
      var seg2 = txt2.substring(0, Math.min(overlap, len2));

      for (jj = 0; jj < overlap; jj++) {
        var ch1 = jj < len1 ? seg1.substring(jj, jj + 1) : " ";
        var ch2 = jj < len2 ? seg2.substring(jj, jj + 1) : " ";

        if (ch1 !== " " && ch2 !== " ") {
          if (opts.fittingRules.hLayout === FITTING) {
            piece2 += uni_Smush(ch1, ch2, opts.hardBlank);
          } else if (opts.fittingRules.hLayout === SMUSHING) {
            piece2 += uni_Smush(ch1, ch2, opts.hardBlank);
          } else {
            // Controlled Smushing
            var nextCh = "";
            nextCh =
              !nextCh && opts.fittingRules.hRule1
                ? hRule1_Smush(ch1, ch2, opts.hardBlank)
                : nextCh;
            nextCh =
              !nextCh && opts.fittingRules.hRule2
                ? hRule2_Smush(ch1, ch2, opts.hardBlank)
                : nextCh;
            nextCh =
              !nextCh && opts.fittingRules.hRule3
                ? hRule3_Smush(ch1, ch2, opts.hardBlank)
                : nextCh;
            nextCh =
              !nextCh && opts.fittingRules.hRule4
                ? hRule4_Smush(ch1, ch2, opts.hardBlank)
                : nextCh;
            nextCh =
              !nextCh && opts.fittingRules.hRule5
                ? hRule5_Smush(ch1, ch2, opts.hardBlank)
                : nextCh;
            nextCh =
              !nextCh && opts.fittingRules.hRule6
                ? hRule6_Smush(ch1, ch2, opts.hardBlank)
                : nextCh;
            nextCh = nextCh || uni_Smush(ch1, ch2, opts.hardBlank);
            piece2 += nextCh;
          }
        } else {
          piece2 += uni_Smush(ch1, ch2, opts.hardBlank);
        }
      }

      if (overlap >= len2) {
        piece3 = "";
      } else {
        piece3 = txt2.substring(overlap, overlap + Math.max(0, len2 - overlap));
      }
      outputFig[ii] = piece1 + piece2 + piece3;
    }
    return outputFig;
  }

  /*
        Creates new empty ASCII placeholder of give len
        - len - number
    */
  function newFigChar(len) {
    let outputFigText = [],
      row;
    for (row = 0; row < len; row++) {
      outputFigText[row] = "";
    }
    return outputFigText;
  }

  /*
        Return max line of the ASCII Art
        - text is array of lines for text
        - char is next character
     */
  const figLinesWidth = function (textLines) {
    return Math.max.apply(
      Math,
      textLines.map(function (line, i) {
        return line.length;
      })
    );
  };

  /*
       join words or single characaters into single Fig line
       - array - array of ASCII words or single characters: {fig: array, overlap: number}
       - len - height of the Characters (number of rows)
       - opt - options object
    */
  function joinFigArray(array, len, opts) {
    return array.reduce(function (acc, data) {
      return horizontalSmush(acc, data.fig, data.overlap, opts);
    }, newFigChar(len));
  }

  /*
       break long word return leftover characters and line before the break
       - figChars - list of single ASCII characters in form {fig, overlap}
       - len - number of rows
       - opt - options object
    */
  function breakWord(figChars, len, opts) {
    const result = {};
    for (let i = figChars.length; --i; ) {
      let w = joinFigArray(figChars.slice(0, i), len, opts);
      if (figLinesWidth(w) <= opts.width) {
        result.outputFigText = w;
        if (i < figChars.length) {
          result.chars = figChars.slice(i);
        } else {
          result.chars = [];
        }
        break;
      }
    }
    return result;
  }

  function generateFigTextLines(txt, figChars, opts) {
    let charIndex,
      figChar,
      overlap = 0,
      row,
      outputFigText,
      len,
      height = opts.height,
      outputFigLines = [],
      maxWidth,
      nextFigChars,
      figWords = [],
      char,
      isSpace,
      textFigWord,
      textFigLine,
      tmpBreak;

    outputFigText = newFigChar(height);
    if (opts.width > 0 && opts.whitespaceBreak) {
      // list of characters is used to break in the middle of the word when word is logner
      // chars is array of characters with {fig, overlap} and overlap is for whole word
      nextFigChars = {
        chars: [],
        overlap: overlap,
      };
    }
    if (opts.printDirection === 1) {
      txt = txt.split("").reverse().join("");
    }
    len = txt.length;
    for (charIndex = 0; charIndex < len; charIndex++) {
      char = txt.substring(charIndex, charIndex + 1);
      isSpace = char.match(/\s/);
      figChar = figChars[char.charCodeAt(0)];
      textFigLine = null;
      if (figChar) {
        if (opts.fittingRules.hLayout !== FULL_WIDTH) {
          overlap = 10000; // a value too high to be the overlap
          for (row = 0; row < opts.height; row++) {
            overlap = Math.min(
              overlap,
              getHorizontalSmushLength(outputFigText[row], figChar[row], opts)
            );
          }
          overlap = overlap === 10000 ? 0 : overlap;
        }
        if (opts.width > 0) {
          if (opts.whitespaceBreak) {
            // next character in last word (figChars have same data as words)
            textFigWord = joinFigArray(
              nextFigChars.chars.concat([
                {
                  fig: figChar,
                  overlap: overlap,
                },
              ]),
              height,
              opts
            );
            textFigLine = joinFigArray(
              figWords.concat([
                {
                  fig: textFigWord,
                  overlap: nextFigChars.overlap,
                },
              ]),
              height,
              opts
            );
            maxWidth = figLinesWidth(textFigLine);
          } else {
            textFigLine = horizontalSmush(
              outputFigText,
              figChar,
              overlap,
              opts
            );
            maxWidth = figLinesWidth(textFigLine);
          }
          if (maxWidth >= opts.width && charIndex > 0) {
            if (opts.whitespaceBreak) {
              outputFigText = joinFigArray(figWords.slice(0, -1), height, opts);
              if (figWords.length > 1) {
                outputFigLines.push(outputFigText);
                outputFigText = newFigChar(height);
              }
              figWords = [];
            } else {
              outputFigLines.push(outputFigText);
              outputFigText = newFigChar(height);
            }
          }
        }
        if (opts.width > 0 && opts.whitespaceBreak) {
          if (!isSpace || charIndex === len - 1) {
            nextFigChars.chars.push({ fig: figChar, overlap: overlap });
          }
          if (isSpace || charIndex === len - 1) {
            // break long words
            tmpBreak = null;
            while (true) {
              textFigLine = joinFigArray(nextFigChars.chars, height, opts);
              maxWidth = figLinesWidth(textFigLine);
              if (maxWidth >= opts.width) {
                tmpBreak = breakWord(nextFigChars.chars, height, opts);
                nextFigChars = { chars: tmpBreak.chars };
                outputFigLines.push(tmpBreak.outputFigText);
              } else {
                break;
              }
            }
            // any leftovers
            if (maxWidth > 0) {
              if (tmpBreak) {
                figWords.push({ fig: textFigLine, overlap: 1 });
              } else {
                figWords.push({
                  fig: textFigLine,
                  overlap: nextFigChars.overlap,
                });
              }
            }
            // save space character and current overlap for smush in joinFigWords
            if (isSpace) {
              figWords.push({ fig: figChar, overlap: overlap });
              outputFigText = newFigChar(height);
            }
            if (charIndex === len - 1) {
              // last line
              outputFigText = joinFigArray(figWords, height, opts);
            }
            nextFigChars = {
              chars: [],
              overlap: overlap,
            };
            continue;
          }
        }
        outputFigText = horizontalSmush(outputFigText, figChar, overlap, opts);
      }
    }
    // special case when last line would be empty
    // this may happen if text fit exactly opt.width
    if (figLinesWidth(outputFigText) > 0) {
      outputFigLines.push(outputFigText);
    }
    // remove hardblanks
    if (opts.showHardBlanks !== true) {
      outputFigLines.forEach(function (outputFigText) {
        len = outputFigText.length;
        for (row = 0; row < len; row++) {
          outputFigText[row] = outputFigText[row].replace(
            new RegExp("\\" + opts.hardBlank, "g"),
            " "
          );
        }
      });
    }
    return outputFigLines;
  }

  // -------------------------------------------------------------------------
  // Parsing and Generation methods

  const getHorizontalFittingRules = function (layout, options) {
    let props = [
        "hLayout",
        "hRule1",
        "hRule2",
        "hRule3",
        "hRule4",
        "hRule5",
        "hRule6",
      ],
      params = {},
      ii;
    if (layout === "default") {
      for (ii = 0; ii < props.length; ii++) {
        params[props[ii]] = options.fittingRules[props[ii]];
      }
    } else if (layout === "full") {
      params = {
        hLayout: FULL_WIDTH,
        hRule1: false,
        hRule2: false,
        hRule3: false,
        hRule4: false,
        hRule5: false,
        hRule6: false,
      };
    } else if (layout === "fitted") {
      params = {
        hLayout: FITTING,
        hRule1: false,
        hRule2: false,
        hRule3: false,
        hRule4: false,
        hRule5: false,
        hRule6: false,
      };
    } else if (layout === "controlled smushing") {
      params = {
        hLayout: CONTROLLED_SMUSHING,
        hRule1: true,
        hRule2: true,
        hRule3: true,
        hRule4: true,
        hRule5: true,
        hRule6: true,
      };
    } else if (layout === "universal smushing") {
      params = {
        hLayout: SMUSHING,
        hRule1: false,
        hRule2: false,
        hRule3: false,
        hRule4: false,
        hRule5: false,
        hRule6: false,
      };
    } else {
      return;
    }
    return params;
  };

  const getVerticalFittingRules = function (layout, options) {
    let props = ["vLayout", "vRule1", "vRule2", "vRule3", "vRule4", "vRule5"],
      params = {},
      ii;
    if (layout === "default") {
      for (ii = 0; ii < props.length; ii++) {
        params[props[ii]] = options.fittingRules[props[ii]];
      }
    } else if (layout === "full") {
      params = {
        vLayout: FULL_WIDTH,
        vRule1: false,
        vRule2: false,
        vRule3: false,
        vRule4: false,
        vRule5: false,
      };
    } else if (layout === "fitted") {
      params = {
        vLayout: FITTING,
        vRule1: false,
        vRule2: false,
        vRule3: false,
        vRule4: false,
        vRule5: false,
      };
    } else if (layout === "controlled smushing") {
      params = {
        vLayout: CONTROLLED_SMUSHING,
        vRule1: true,
        vRule2: true,
        vRule3: true,
        vRule4: true,
        vRule5: true,
      };
    } else if (layout === "universal smushing") {
      params = {
        vLayout: SMUSHING,
        vRule1: false,
        vRule2: false,
        vRule3: false,
        vRule4: false,
        vRule5: false,
      };
    } else {
      return;
    }
    return params;
  };

  /*
        Generates the ASCII Art
        - fontName: Font to use
        - option: Options to override the defaults
        - txt: The text to make into ASCII Art
    */
  const generateText = function (fontName, options, txt) {
    txt = txt.replace(/\r\n/g, "\n").replace(/\r/g, "\n");
    let lines = txt.split("\n");
    let figLines = [];
    let ii, len, output;
    len = lines.length;
    for (ii = 0; ii < len; ii++) {
      figLines = figLines.concat(
        generateFigTextLines(lines[ii], figFonts[fontName], options)
      );
    }
    len = figLines.length;
    output = figLines[0];
    for (ii = 1; ii < len; ii++) {
      output = smushVerticalFigLines(output, figLines[ii], options);
    }

    return output ? output.join("\n") : "";
  };

  /*
      takes assigned options and merges them with the default options from the choosen font
     */
  function _reworkFontOpts(fontOpts, options) {
    let myOpts = JSON.parse(JSON.stringify(fontOpts)), // make a copy because we may edit this (see below)
      params,
      prop;

    /*
         If the user is chosing to use a specific type of layout (e.g., 'full', 'fitted', etc etc)
         Then we need to override the default font options.
         */
    if (typeof options.horizontalLayout !== "undefined") {
      params = getHorizontalFittingRules(options.horizontalLayout, fontOpts);
      for (prop in params) {
        if (params.hasOwnProperty(prop)) {
          myOpts.fittingRules[prop] = params[prop];
        }
      }
    }
    if (typeof options.verticalLayout !== "undefined") {
      params = getVerticalFittingRules(options.verticalLayout, fontOpts);
      for (prop in params) {
        if (params.hasOwnProperty(prop)) {
          myOpts.fittingRules[prop] = params[prop];
        }
      }
    }
    myOpts.printDirection =
      typeof options.printDirection !== "undefined"
        ? options.printDirection
        : fontOpts.printDirection;
    myOpts.showHardBlanks = options.showHardBlanks || false;
    myOpts.width = options.width || -1;
    myOpts.whitespaceBreak = options.whitespaceBreak || false;

    return myOpts;
  }

  // -------------------------------------------------------------------------
  // Public methods

  /*
        A short-cut for the figlet.text method

        Parameters:
        - txt (string): The text to make into ASCII Art
        - options (object/string - optional): Options that will override the current font's default options.
          If a string is provided instead of an object, it is assumed to be the font name.

            * font
            * horizontalLayout
            * verticalLayout
            * showHardBlanks - Wont remove hardblank characters

        - next (function): A callback function, it will contained the outputted ASCII Art.
    */
  const me = function (txt, options, next) {
    return me.text(txt, options, next);
  };
  me.text = async function (txt, options, next) {
    let fontName = "";

    // Validate inputs
    txt = txt + "";

    if (typeof arguments[1] === "function") {
      next = options;
      options = {};
      options.font = figDefaults.font; // default font
    }

    if (typeof options === "string") {
      fontName = options;
      options = {};
    } else {
      options = options || {};
      fontName = options.font || figDefaults.font;
    }

    return await new Promise((resolve, reject) => {
      /*
          Load the font. If it loads, it's data will be contained in the figFonts object.
          The callback will recieve a fontsOpts object, which contains the default
          options of the font (its fitting rules, etc etc).
      */
      me.loadFont(fontName, function (err, fontOpts) {
        if (err) {
          reject(err);
          if (next) next(err);
          return;
        }

        const generatedTxt = generateText(
          fontName,
          _reworkFontOpts(fontOpts, options),
          txt
        );

        resolve(generatedTxt);
        if (next) next(null, generatedTxt);
      });
    });
  };

  /*
        Synchronous version of figlet.text.
        Accepts the same parameters.
     */
  me.textSync = function (txt, options) {
    let fontName = "";

    // Validate inputs
    txt = txt + "";

    if (typeof options === "string") {
      fontName = options;
      options = {};
    } else {
      options = options || {};
      fontName = options.font || figDefaults.font;
    }

    var fontOpts = _reworkFontOpts(me.loadFontSync(fontName), options);
    return generateText(fontName, fontOpts, txt);
  };

  /*
        Returns metadata about a specfic FIGlet font.

        Returns:
            next(err, options, headerComment)
            - err: The error if an error occurred, otherwise null/falsey.
            - options (object): The options defined for the font.
            - headerComment (string): The font's header comment.
    */
  me.metadata = function (fontName, next) {
    fontName = fontName + "";

    /*
            Load the font. If it loads, it's data will be contained in the figFonts object.
            The callback will recieve a fontsOpts object, which contains the default
            options of the font (its fitting rules, etc etc).
        */
    me.loadFont(fontName, function (err, fontOpts) {
      if (err) {
        next(err);
        return;
      }

      next(null, fontOpts, figFonts[fontName].comment);
    });
  };

  /*
        Allows you to override defaults. See the definition of the figDefaults object up above
        to see what properties can be overridden.
        Returns the options for the font.
    */
  me.defaults = function (opts) {
    if (typeof opts === "object" && opts !== null) {
      for (var prop in opts) {
        if (opts.hasOwnProperty(prop)) {
          figDefaults[prop] = opts[prop];
        }
      }
    }
    return JSON.parse(JSON.stringify(figDefaults));
  };

  /*
        Parses data from a FIGlet font file and places it into the figFonts object.
    */
  me.parseFont = function (fontName, data) {
    data = data.replace(/\r\n/g, "\n").replace(/\r/g, "\n");
    figFonts[fontName] = {};

    var lines = data.split("\n");
    var headerData = lines.splice(0, 1)[0].split(" ");
    var figFont = figFonts[fontName];
    var opts = {};

    opts.hardBlank = headerData[0].substr(5, 1);
    opts.height = parseInt(headerData[1], 10);
    opts.baseline = parseInt(headerData[2], 10);
    opts.maxLength = parseInt(headerData[3], 10);
    opts.oldLayout = parseInt(headerData[4], 10);
    opts.numCommentLines = parseInt(headerData[5], 10);
    opts.printDirection =
      headerData.length >= 6 ? parseInt(headerData[6], 10) : 0;
    opts.fullLayout =
      headerData.length >= 7 ? parseInt(headerData[7], 10) : null;
    opts.codeTagCount =
      headerData.length >= 8 ? parseInt(headerData[8], 10) : null;
    opts.fittingRules = getSmushingRules(opts.oldLayout, opts.fullLayout);

    figFont.options = opts;

    // error check
    if (
      opts.hardBlank.length !== 1 ||
      isNaN(opts.height) ||
      isNaN(opts.baseline) ||
      isNaN(opts.maxLength) ||
      isNaN(opts.oldLayout) ||
      isNaN(opts.numCommentLines)
    ) {
      throw new Error("FIGlet header contains invalid values.");
    }

    /*
            All FIGlet fonts must contain chars 32-126, 196, 214, 220, 228, 246, 252, 223
        */

    let charNums = [],
      ii;
    for (ii = 32; ii <= 126; ii++) {
      charNums.push(ii);
    }
    charNums = charNums.concat(196, 214, 220, 228, 246, 252, 223);

    // error check - validate that there are enough lines in the file
    if (lines.length < opts.numCommentLines + opts.height * charNums.length) {
      throw new Error("FIGlet file is missing data.");
    }

    /*
            Parse out the context of the file and put it into our figFont object
        */

    let cNum,
      endCharRegEx,
      parseError = false;

    figFont.comment = lines.splice(0, opts.numCommentLines).join("\n");
    figFont.numChars = 0;

    while (lines.length > 0 && figFont.numChars < charNums.length) {
      cNum = charNums[figFont.numChars];
      figFont[cNum] = lines.splice(0, opts.height);
      // remove end sub-chars
      for (ii = 0; ii < opts.height; ii++) {
        if (typeof figFont[cNum][ii] === "undefined") {
          figFont[cNum][ii] = "";
        } else {
          endCharRegEx = new RegExp(
            "\\" +
              figFont[cNum][ii].substr(figFont[cNum][ii].length - 1, 1) +
              "+$"
          );
          figFont[cNum][ii] = figFont[cNum][ii].replace(endCharRegEx, "");
        }
      }
      figFont.numChars++;
    }

    /*
            Now we check to see if any additional characters are present
        */

    while (lines.length > 0) {
      cNum = lines.splice(0, 1)[0].split(" ")[0];
      if (/^0[xX][0-9a-fA-F]+$/.test(cNum)) {
        cNum = parseInt(cNum, 16);
      } else if (/^0[0-7]+$/.test(cNum)) {
        cNum = parseInt(cNum, 8);
      } else if (/^[0-9]+$/.test(cNum)) {
        cNum = parseInt(cNum, 10);
      } else if (/^-0[xX][0-9a-fA-F]+$/.test(cNum)) {
        cNum = parseInt(cNum, 16);
      } else {
        if (cNum === "") {
          break;
        }
        // something's wrong
        console.log("Invalid data:" + cNum);
        parseError = true;
        break;
      }

      figFont[cNum] = lines.splice(0, opts.height);
      // remove end sub-chars
      for (ii = 0; ii < opts.height; ii++) {
        if (typeof figFont[cNum][ii] === "undefined") {
          figFont[cNum][ii] = "";
        } else {
          endCharRegEx = new RegExp(
            "\\" +
              figFont[cNum][ii].substr(figFont[cNum][ii].length - 1, 1) +
              "+$"
          );
          figFont[cNum][ii] = figFont[cNum][ii].replace(endCharRegEx, "");
        }
      }
      figFont.numChars++;
    }

    // error check
    if (parseError === true) {
      throw new Error("Error parsing data.");
    }

    return opts;
  };

  /*
        Loads a font.
    */
  me.loadFont = function (fontName, next) {
    if (figFonts[fontName]) {
      next(null, figFonts[fontName].options);
      return;
    }

    if (typeof fetch !== "function") {
      console.error(
        "figlet.js requires the fetch API or a fetch polyfill such as https://cdnjs.com/libraries/fetch"
      );
      throw new Error("fetch is required for figlet.js to work.");
    }

    fetch(figDefaults.fontPath + "/" + fontName + ".flf")
      .then(function (response) {
        if (response.ok) {
          return response.text();
        }

        console.log("Unexpected response", response);
        throw new Error("Network response was not ok.");
      })
      .then(function (text) {
        next(null, me.parseFont(fontName, text));
      })
      .catch(next);
  };

  /*
        loads a font synchronously, not implemented for the browser
     */
  me.loadFontSync = function (name) {
    if (figFonts[name]) {
      return figFonts[name].options;
    }
    throw new Error(
      "synchronous font loading is not implemented for the browser"
    );
  };

  /*
        preloads a list of fonts prior to using textSync
        - fonts: an array of font names (i.e. ["Standard","Soft"])
        - next: callback function
     */
  me.preloadFonts = function (fonts, next) {
    let fontData = [];

    fonts
      .reduce(function (promise, name) {
        return promise.then(function () {
          return fetch(figDefaults.fontPath + "/" + name + ".flf")
            .then((response) => {
              return response.text();
            })
            .then(function (data) {
              fontData.push(data);
            });
        });
      }, Promise.resolve())
      .then(function (res) {
        for (var i in fonts) {
          if (fonts.hasOwnProperty(i)) {
            me.parseFont(fonts[i], fontData[i]);
          }
        }

        if (next) {
          next();
        }
      });
  };

  me.figFonts = figFonts;

  return me;
})();

// for node.js
if (true) {
  if (typeof module.exports !== "undefined") {
    module.exports = figlet;
  }
}


/***/ }),

/***/ "./node_modules/figlet/lib/node-figlet.js":
/*!************************************************!*\
  !*** ./node_modules/figlet/lib/node-figlet.js ***!
  \************************************************/
/***/ ((module, __unused_webpack_exports, __webpack_require__) => {

/*
	Node plugin for figlet.js
*/

const figlet = __webpack_require__(/*! ./figlet.js */ "./node_modules/figlet/lib/figlet.js"),
  fs = __webpack_require__(/*! fs */ "fs"),
  path = __webpack_require__(/*! path */ "path"),
  fontDir = path.join(__dirname, "/../fonts/");

/*
    Loads a font into the figlet object.

    Parameters:
    - name (string): Name of the font to load.
    - next (function): Callback function.
*/
figlet.loadFont = function (name, next) {
  if (figlet.figFonts[name]) {
    next(null, figlet.figFonts[name].options);
    return;
  }

  fs.readFile(
    path.join(fontDir, name + ".flf"),
    { encoding: "utf-8" },
    function (err, fontData) {
      if (err) {
        return next(err);
      }

      fontData = fontData + "";
      try {
        next(null, figlet.parseFont(name, fontData));
      } catch (error) {
        next(error);
      }
    }
  );
};

/*
 Loads a font synchronously into the figlet object.

 Parameters:
 - name (string): Name of the font to load.
 */
figlet.loadFontSync = function (name) {
  if (figlet.figFonts[name]) {
    return figlet.figFonts[name].options;
  }

  var fontData = fs.readFileSync(path.join(fontDir, name + ".flf"), {
    encoding: "utf-8",
  });

  fontData = fontData + "";
  return figlet.parseFont(name, fontData);
};

/*
    Returns an array containing all of the font names
*/
figlet.fonts = function (next) {
  var fontList = [];
  fs.readdir(fontDir, function (err, files) {
    // '/' denotes the root folder
    if (err) {
      return next(err);
    }

    files.forEach(function (file) {
      if (/\.flf$/.test(file)) {
        fontList.push(file.replace(/\.flf$/, ""));
      }
    });

    next(null, fontList);
  });
};

figlet.fontsSync = function () {
  var fontList = [];
  fs.readdirSync(fontDir).forEach(function (file) {
    if (/\.flf$/.test(file)) {
      fontList.push(file.replace(/\.flf$/, ""));
    }
  });

  return fontList;
};

module.exports = figlet;


/***/ }),

/***/ "./src/util/index.ts":
/*!***************************!*\
  !*** ./src/util/index.ts ***!
  \***************************/
/***/ ((__unused_webpack_module, exports, __webpack_require__) => {

"use strict";

Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.expandVariables = expandVariables;
exports.readJsonFile = readJsonFile;
exports.launch = launch;
var fs_1 = __webpack_require__(/*! fs */ "fs");
var chalk_1 = __webpack_require__(/*! chalk */ "./node_modules/chalk/source/index.js");
var child_process_1 = __webpack_require__(/*! child_process */ "child_process");
var strip_json_comments_1 = __webpack_require__(/*! strip-json-comments */ "./node_modules/strip-json-comments/index.js");
function expandVariables(value) {
    if (typeof value === 'string') {
        return value
            .replace(/\$\{workspaceRoot\}/g, process.cwd())
            .replace(/\$\{workspaceFolder\}/g, process.cwd())
            .replace(/\$\{env\.(\w+)\}/g, function (match, varName) { return process.env[varName] || ''; });
    }
    if (typeof value === 'object' && value !== null) {
        Array.isArray(value) ? value.map(expandVariables) : Object.keys(value).forEach(function (key) { return value[key] = expandVariables(value[key]); });
    }
    return value;
}
function readJsonFile(path) {
    var launchFile = (0, fs_1.readFileSync)(path, 'utf8');
    var strippedLaunchFile = (0, strip_json_comments_1.default)(launchFile);
    var launchConfigurations = JSON.parse(strippedLaunchFile);
    return launchConfigurations;
}
var COLORS = [
    chalk_1.default.magenta,
    chalk_1.default.blue,
    chalk_1.default.cyan,
    chalk_1.default.green,
    chalk_1.default.yellow,
    chalk_1.default.red
];
function launch(launchFile, configurationName, cwd) {
    var _a, _b, _c;
    var expandedLaunchFile = expandVariables(launchFile);
    var nameWidth = expandedLaunchFile.configurations.reduce(function (max, config) { return Math.max(max, config.name.length); }, 0) + 1;
    var config = expandedLaunchFile.configurations.find(function (config) { return config.name === configurationName; });
    if (!config) {
        console.error(chalk_1.default.red("Configuration ".concat(configurationName, " not found")));
        return;
    }
    console.log(chalk_1.default.bold("Launching ".concat(config.name)));
    console.log(config);
    var color = COLORS[Math.floor(Math.random() * COLORS.length)];
    console.log(color("Launching ".concat(config.name)));
    // TODO: Needs OS specific handling
    var runtimeExecutable = ((_a = config.osx) === null || _a === void 0 ? void 0 : _a.runtimeExecutable) || '';
    var program = config.cwd || '.';
    (0, child_process_1.execSync)("".concat(runtimeExecutable, " ").concat(((_b = config.runtimeArgs) === null || _b === void 0 ? void 0 : _b.join(' ')) || '', " ").concat(program, " ").concat(((_c = config.args) === null || _c === void 0 ? void 0 : _c.join(' ')) || ''), {
        stdio: 'inherit',
    });
}


/***/ }),

/***/ "child_process":
/*!********************************!*\
  !*** external "child_process" ***!
  \********************************/
/***/ ((module) => {

"use strict";
module.exports = require("child_process");

/***/ }),

/***/ "fs":
/*!*********************!*\
  !*** external "fs" ***!
  \*********************/
/***/ ((module) => {

"use strict";
module.exports = require("fs");

/***/ }),

/***/ "node:child_process":
/*!*************************************!*\
  !*** external "node:child_process" ***!
  \*************************************/
/***/ ((module) => {

"use strict";
module.exports = require("node:child_process");

/***/ }),

/***/ "node:events":
/*!******************************!*\
  !*** external "node:events" ***!
  \******************************/
/***/ ((module) => {

"use strict";
module.exports = require("node:events");

/***/ }),

/***/ "node:fs":
/*!**************************!*\
  !*** external "node:fs" ***!
  \**************************/
/***/ ((module) => {

"use strict";
module.exports = require("node:fs");

/***/ }),

/***/ "node:os":
/*!**************************!*\
  !*** external "node:os" ***!
  \**************************/
/***/ ((module) => {

"use strict";
module.exports = require("node:os");

/***/ }),

/***/ "node:path":
/*!****************************!*\
  !*** external "node:path" ***!
  \****************************/
/***/ ((module) => {

"use strict";
module.exports = require("node:path");

/***/ }),

/***/ "node:process":
/*!*******************************!*\
  !*** external "node:process" ***!
  \*******************************/
/***/ ((module) => {

"use strict";
module.exports = require("node:process");

/***/ }),

/***/ "node:tty":
/*!***************************!*\
  !*** external "node:tty" ***!
  \***************************/
/***/ ((module) => {

"use strict";
module.exports = require("node:tty");

/***/ }),

/***/ "path":
/*!***********************!*\
  !*** external "path" ***!
  \***********************/
/***/ ((module) => {

"use strict";
module.exports = require("path");

/***/ }),

/***/ "./node_modules/commander/index.js":
/*!*****************************************!*\
  !*** ./node_modules/commander/index.js ***!
  \*****************************************/
/***/ ((__unused_webpack_module, exports, __webpack_require__) => {

const { Argument } = __webpack_require__(/*! ./lib/argument.js */ "./node_modules/commander/lib/argument.js");
const { Command } = __webpack_require__(/*! ./lib/command.js */ "./node_modules/commander/lib/command.js");
const { CommanderError, InvalidArgumentError } = __webpack_require__(/*! ./lib/error.js */ "./node_modules/commander/lib/error.js");
const { Help } = __webpack_require__(/*! ./lib/help.js */ "./node_modules/commander/lib/help.js");
const { Option } = __webpack_require__(/*! ./lib/option.js */ "./node_modules/commander/lib/option.js");

exports.program = new Command();

exports.createCommand = (name) => new Command(name);
exports.createOption = (flags, description) => new Option(flags, description);
exports.createArgument = (name, description) => new Argument(name, description);

/**
 * Expose classes
 */

exports.Command = Command;
exports.Option = Option;
exports.Argument = Argument;
exports.Help = Help;

exports.CommanderError = CommanderError;
exports.InvalidArgumentError = InvalidArgumentError;
exports.InvalidOptionArgumentError = InvalidArgumentError; // Deprecated


/***/ }),

/***/ "./node_modules/commander/lib/argument.js":
/*!************************************************!*\
  !*** ./node_modules/commander/lib/argument.js ***!
  \************************************************/
/***/ ((__unused_webpack_module, exports, __webpack_require__) => {

const { InvalidArgumentError } = __webpack_require__(/*! ./error.js */ "./node_modules/commander/lib/error.js");

class Argument {
  /**
   * Initialize a new command argument with the given name and description.
   * The default is that the argument is required, and you can explicitly
   * indicate this with <> around the name. Put [] around the name for an optional argument.
   *
   * @param {string} name
   * @param {string} [description]
   */

  constructor(name, description) {
    this.description = description || '';
    this.variadic = false;
    this.parseArg = undefined;
    this.defaultValue = undefined;
    this.defaultValueDescription = undefined;
    this.argChoices = undefined;

    switch (name[0]) {
      case '<': // e.g. <required>
        this.required = true;
        this._name = name.slice(1, -1);
        break;
      case '[': // e.g. [optional]
        this.required = false;
        this._name = name.slice(1, -1);
        break;
      default:
        this.required = true;
        this._name = name;
        break;
    }

    if (this._name.length > 3 && this._name.slice(-3) === '...') {
      this.variadic = true;
      this._name = this._name.slice(0, -3);
    }
  }

  /**
   * Return argument name.
   *
   * @return {string}
   */

  name() {
    return this._name;
  }

  /**
   * @package
   */

  _concatValue(value, previous) {
    if (previous === this.defaultValue || !Array.isArray(previous)) {
      return [value];
    }

    return previous.concat(value);
  }

  /**
   * Set the default value, and optionally supply the description to be displayed in the help.
   *
   * @param {*} value
   * @param {string} [description]
   * @return {Argument}
   */

  default(value, description) {
    this.defaultValue = value;
    this.defaultValueDescription = description;
    return this;
  }

  /**
   * Set the custom handler for processing CLI command arguments into argument values.
   *
   * @param {Function} [fn]
   * @return {Argument}
   */

  argParser(fn) {
    this.parseArg = fn;
    return this;
  }

  /**
   * Only allow argument value to be one of choices.
   *
   * @param {string[]} values
   * @return {Argument}
   */

  choices(values) {
    this.argChoices = values.slice();
    this.parseArg = (arg, previous) => {
      if (!this.argChoices.includes(arg)) {
        throw new InvalidArgumentError(
          `Allowed choices are ${this.argChoices.join(', ')}.`,
        );
      }
      if (this.variadic) {
        return this._concatValue(arg, previous);
      }
      return arg;
    };
    return this;
  }

  /**
   * Make argument required.
   *
   * @returns {Argument}
   */
  argRequired() {
    this.required = true;
    return this;
  }

  /**
   * Make argument optional.
   *
   * @returns {Argument}
   */
  argOptional() {
    this.required = false;
    return this;
  }
}

/**
 * Takes an argument and returns its human readable equivalent for help usage.
 *
 * @param {Argument} arg
 * @return {string}
 * @private
 */

function humanReadableArgName(arg) {
  const nameOutput = arg.name() + (arg.variadic === true ? '...' : '');

  return arg.required ? '<' + nameOutput + '>' : '[' + nameOutput + ']';
}

exports.Argument = Argument;
exports.humanReadableArgName = humanReadableArgName;


/***/ }),

/***/ "./node_modules/commander/lib/command.js":
/*!***********************************************!*\
  !*** ./node_modules/commander/lib/command.js ***!
  \***********************************************/
/***/ ((__unused_webpack_module, exports, __webpack_require__) => {

const EventEmitter = (__webpack_require__(/*! node:events */ "node:events").EventEmitter);
const childProcess = __webpack_require__(/*! node:child_process */ "node:child_process");
const path = __webpack_require__(/*! node:path */ "node:path");
const fs = __webpack_require__(/*! node:fs */ "node:fs");
const process = __webpack_require__(/*! node:process */ "node:process");

const { Argument, humanReadableArgName } = __webpack_require__(/*! ./argument.js */ "./node_modules/commander/lib/argument.js");
const { CommanderError } = __webpack_require__(/*! ./error.js */ "./node_modules/commander/lib/error.js");
const { Help } = __webpack_require__(/*! ./help.js */ "./node_modules/commander/lib/help.js");
const { Option, DualOptions } = __webpack_require__(/*! ./option.js */ "./node_modules/commander/lib/option.js");
const { suggestSimilar } = __webpack_require__(/*! ./suggestSimilar */ "./node_modules/commander/lib/suggestSimilar.js");

class Command extends EventEmitter {
  /**
   * Initialize a new `Command`.
   *
   * @param {string} [name]
   */

  constructor(name) {
    super();
    /** @type {Command[]} */
    this.commands = [];
    /** @type {Option[]} */
    this.options = [];
    this.parent = null;
    this._allowUnknownOption = false;
    this._allowExcessArguments = true;
    /** @type {Argument[]} */
    this.registeredArguments = [];
    this._args = this.registeredArguments; // deprecated old name
    /** @type {string[]} */
    this.args = []; // cli args with options removed
    this.rawArgs = [];
    this.processedArgs = []; // like .args but after custom processing and collecting variadic
    this._scriptPath = null;
    this._name = name || '';
    this._optionValues = {};
    this._optionValueSources = {}; // default, env, cli etc
    this._storeOptionsAsProperties = false;
    this._actionHandler = null;
    this._executableHandler = false;
    this._executableFile = null; // custom name for executable
    this._executableDir = null; // custom search directory for subcommands
    this._defaultCommandName = null;
    this._exitCallback = null;
    this._aliases = [];
    this._combineFlagAndOptionalValue = true;
    this._description = '';
    this._summary = '';
    this._argsDescription = undefined; // legacy
    this._enablePositionalOptions = false;
    this._passThroughOptions = false;
    this._lifeCycleHooks = {}; // a hash of arrays
    /** @type {(boolean | string)} */
    this._showHelpAfterError = false;
    this._showSuggestionAfterError = true;

    // see .configureOutput() for docs
    this._outputConfiguration = {
      writeOut: (str) => process.stdout.write(str),
      writeErr: (str) => process.stderr.write(str),
      getOutHelpWidth: () =>
        process.stdout.isTTY ? process.stdout.columns : undefined,
      getErrHelpWidth: () =>
        process.stderr.isTTY ? process.stderr.columns : undefined,
      outputError: (str, write) => write(str),
    };

    this._hidden = false;
    /** @type {(Option | null | undefined)} */
    this._helpOption = undefined; // Lazy created on demand. May be null if help option is disabled.
    this._addImplicitHelpCommand = undefined; // undecided whether true or false yet, not inherited
    /** @type {Command} */
    this._helpCommand = undefined; // lazy initialised, inherited
    this._helpConfiguration = {};
  }

  /**
   * Copy settings that are useful to have in common across root command and subcommands.
   *
   * (Used internally when adding a command using `.command()` so subcommands inherit parent settings.)
   *
   * @param {Command} sourceCommand
   * @return {Command} `this` command for chaining
   */
  copyInheritedSettings(sourceCommand) {
    this._outputConfiguration = sourceCommand._outputConfiguration;
    this._helpOption = sourceCommand._helpOption;
    this._helpCommand = sourceCommand._helpCommand;
    this._helpConfiguration = sourceCommand._helpConfiguration;
    this._exitCallback = sourceCommand._exitCallback;
    this._storeOptionsAsProperties = sourceCommand._storeOptionsAsProperties;
    this._combineFlagAndOptionalValue =
      sourceCommand._combineFlagAndOptionalValue;
    this._allowExcessArguments = sourceCommand._allowExcessArguments;
    this._enablePositionalOptions = sourceCommand._enablePositionalOptions;
    this._showHelpAfterError = sourceCommand._showHelpAfterError;
    this._showSuggestionAfterError = sourceCommand._showSuggestionAfterError;

    return this;
  }

  /**
   * @returns {Command[]}
   * @private
   */

  _getCommandAndAncestors() {
    const result = [];
    // eslint-disable-next-line @typescript-eslint/no-this-alias
    for (let command = this; command; command = command.parent) {
      result.push(command);
    }
    return result;
  }

  /**
   * Define a command.
   *
   * There are two styles of command: pay attention to where to put the description.
   *
   * @example
   * // Command implemented using action handler (description is supplied separately to `.command`)
   * program
   *   .command('clone <source> [destination]')
   *   .description('clone a repository into a newly created directory')
   *   .action((source, destination) => {
   *     console.log('clone command called');
   *   });
   *
   * // Command implemented using separate executable file (description is second parameter to `.command`)
   * program
   *   .command('start <service>', 'start named service')
   *   .command('stop [service]', 'stop named service, or all if no name supplied');
   *
   * @param {string} nameAndArgs - command name and arguments, args are `<required>` or `[optional]` and last may also be `variadic...`
   * @param {(object | string)} [actionOptsOrExecDesc] - configuration options (for action), or description (for executable)
   * @param {object} [execOpts] - configuration options (for executable)
   * @return {Command} returns new command for action handler, or `this` for executable command
   */

  command(nameAndArgs, actionOptsOrExecDesc, execOpts) {
    let desc = actionOptsOrExecDesc;
    let opts = execOpts;
    if (typeof desc === 'object' && desc !== null) {
      opts = desc;
      desc = null;
    }
    opts = opts || {};
    const [, name, args] = nameAndArgs.match(/([^ ]+) *(.*)/);

    const cmd = this.createCommand(name);
    if (desc) {
      cmd.description(desc);
      cmd._executableHandler = true;
    }
    if (opts.isDefault) this._defaultCommandName = cmd._name;
    cmd._hidden = !!(opts.noHelp || opts.hidden); // noHelp is deprecated old name for hidden
    cmd._executableFile = opts.executableFile || null; // Custom name for executable file, set missing to null to match constructor
    if (args) cmd.arguments(args);
    this._registerCommand(cmd);
    cmd.parent = this;
    cmd.copyInheritedSettings(this);

    if (desc) return this;
    return cmd;
  }

  /**
   * Factory routine to create a new unattached command.
   *
   * See .command() for creating an attached subcommand, which uses this routine to
   * create the command. You can override createCommand to customise subcommands.
   *
   * @param {string} [name]
   * @return {Command} new command
   */

  createCommand(name) {
    return new Command(name);
  }

  /**
   * You can customise the help with a subclass of Help by overriding createHelp,
   * or by overriding Help properties using configureHelp().
   *
   * @return {Help}
   */

  createHelp() {
    return Object.assign(new Help(), this.configureHelp());
  }

  /**
   * You can customise the help by overriding Help properties using configureHelp(),
   * or with a subclass of Help by overriding createHelp().
   *
   * @param {object} [configuration] - configuration options
   * @return {(Command | object)} `this` command for chaining, or stored configuration
   */

  configureHelp(configuration) {
    if (configuration === undefined) return this._helpConfiguration;

    this._helpConfiguration = configuration;
    return this;
  }

  /**
   * The default output goes to stdout and stderr. You can customise this for special
   * applications. You can also customise the display of errors by overriding outputError.
   *
   * The configuration properties are all functions:
   *
   *     // functions to change where being written, stdout and stderr
   *     writeOut(str)
   *     writeErr(str)
   *     // matching functions to specify width for wrapping help
   *     getOutHelpWidth()
   *     getErrHelpWidth()
   *     // functions based on what is being written out
   *     outputError(str, write) // used for displaying errors, and not used for displaying help
   *
   * @param {object} [configuration] - configuration options
   * @return {(Command | object)} `this` command for chaining, or stored configuration
   */

  configureOutput(configuration) {
    if (configuration === undefined) return this._outputConfiguration;

    Object.assign(this._outputConfiguration, configuration);
    return this;
  }

  /**
   * Display the help or a custom message after an error occurs.
   *
   * @param {(boolean|string)} [displayHelp]
   * @return {Command} `this` command for chaining
   */
  showHelpAfterError(displayHelp = true) {
    if (typeof displayHelp !== 'string') displayHelp = !!displayHelp;
    this._showHelpAfterError = displayHelp;
    return this;
  }

  /**
   * Display suggestion of similar commands for unknown commands, or options for unknown options.
   *
   * @param {boolean} [displaySuggestion]
   * @return {Command} `this` command for chaining
   */
  showSuggestionAfterError(displaySuggestion = true) {
    this._showSuggestionAfterError = !!displaySuggestion;
    return this;
  }

  /**
   * Add a prepared subcommand.
   *
   * See .command() for creating an attached subcommand which inherits settings from its parent.
   *
   * @param {Command} cmd - new subcommand
   * @param {object} [opts] - configuration options
   * @return {Command} `this` command for chaining
   */

  addCommand(cmd, opts) {
    if (!cmd._name) {
      throw new Error(`Command passed to .addCommand() must have a name
- specify the name in Command constructor or using .name()`);
    }

    opts = opts || {};
    if (opts.isDefault) this._defaultCommandName = cmd._name;
    if (opts.noHelp || opts.hidden) cmd._hidden = true; // modifying passed command due to existing implementation

    this._registerCommand(cmd);
    cmd.parent = this;
    cmd._checkForBrokenPassThrough();

    return this;
  }

  /**
   * Factory routine to create a new unattached argument.
   *
   * See .argument() for creating an attached argument, which uses this routine to
   * create the argument. You can override createArgument to return a custom argument.
   *
   * @param {string} name
   * @param {string} [description]
   * @return {Argument} new argument
   */

  createArgument(name, description) {
    return new Argument(name, description);
  }

  /**
   * Define argument syntax for command.
   *
   * The default is that the argument is required, and you can explicitly
   * indicate this with <> around the name. Put [] around the name for an optional argument.
   *
   * @example
   * program.argument('<input-file>');
   * program.argument('[output-file]');
   *
   * @param {string} name
   * @param {string} [description]
   * @param {(Function|*)} [fn] - custom argument processing function
   * @param {*} [defaultValue]
   * @return {Command} `this` command for chaining
   */
  argument(name, description, fn, defaultValue) {
    const argument = this.createArgument(name, description);
    if (typeof fn === 'function') {
      argument.default(defaultValue).argParser(fn);
    } else {
      argument.default(fn);
    }
    this.addArgument(argument);
    return this;
  }

  /**
   * Define argument syntax for command, adding multiple at once (without descriptions).
   *
   * See also .argument().
   *
   * @example
   * program.arguments('<cmd> [env]');
   *
   * @param {string} names
   * @return {Command} `this` command for chaining
   */

  arguments(names) {
    names
      .trim()
      .split(/ +/)
      .forEach((detail) => {
        this.argument(detail);
      });
    return this;
  }

  /**
   * Define argument syntax for command, adding a prepared argument.
   *
   * @param {Argument} argument
   * @return {Command} `this` command for chaining
   */
  addArgument(argument) {
    const previousArgument = this.registeredArguments.slice(-1)[0];
    if (previousArgument && previousArgument.variadic) {
      throw new Error(
        `only the last argument can be variadic '${previousArgument.name()}'`,
      );
    }
    if (
      argument.required &&
      argument.defaultValue !== undefined &&
      argument.parseArg === undefined
    ) {
      throw new Error(
        `a default value for a required argument is never used: '${argument.name()}'`,
      );
    }
    this.registeredArguments.push(argument);
    return this;
  }

  /**
   * Customise or override default help command. By default a help command is automatically added if your command has subcommands.
   *
   * @example
   *    program.helpCommand('help [cmd]');
   *    program.helpCommand('help [cmd]', 'show help');
   *    program.helpCommand(false); // suppress default help command
   *    program.helpCommand(true); // add help command even if no subcommands
   *
   * @param {string|boolean} enableOrNameAndArgs - enable with custom name and/or arguments, or boolean to override whether added
   * @param {string} [description] - custom description
   * @return {Command} `this` command for chaining
   */

  helpCommand(enableOrNameAndArgs, description) {
    if (typeof enableOrNameAndArgs === 'boolean') {
      this._addImplicitHelpCommand = enableOrNameAndArgs;
      return this;
    }

    enableOrNameAndArgs = enableOrNameAndArgs ?? 'help [command]';
    const [, helpName, helpArgs] = enableOrNameAndArgs.match(/([^ ]+) *(.*)/);
    const helpDescription = description ?? 'display help for command';

    const helpCommand = this.createCommand(helpName);
    helpCommand.helpOption(false);
    if (helpArgs) helpCommand.arguments(helpArgs);
    if (helpDescription) helpCommand.description(helpDescription);

    this._addImplicitHelpCommand = true;
    this._helpCommand = helpCommand;

    return this;
  }

  /**
   * Add prepared custom help command.
   *
   * @param {(Command|string|boolean)} helpCommand - custom help command, or deprecated enableOrNameAndArgs as for `.helpCommand()`
   * @param {string} [deprecatedDescription] - deprecated custom description used with custom name only
   * @return {Command} `this` command for chaining
   */
  addHelpCommand(helpCommand, deprecatedDescription) {
    // If not passed an object, call through to helpCommand for backwards compatibility,
    // as addHelpCommand was originally used like helpCommand is now.
    if (typeof helpCommand !== 'object') {
      this.helpCommand(helpCommand, deprecatedDescription);
      return this;
    }

    this._addImplicitHelpCommand = true;
    this._helpCommand = helpCommand;
    return this;
  }

  /**
   * Lazy create help command.
   *
   * @return {(Command|null)}
   * @package
   */
  _getHelpCommand() {
    const hasImplicitHelpCommand =
      this._addImplicitHelpCommand ??
      (this.commands.length &&
        !this._actionHandler &&
        !this._findCommand('help'));

    if (hasImplicitHelpCommand) {
      if (this._helpCommand === undefined) {
        this.helpCommand(undefined, undefined); // use default name and description
      }
      return this._helpCommand;
    }
    return null;
  }

  /**
   * Add hook for life cycle event.
   *
   * @param {string} event
   * @param {Function} listener
   * @return {Command} `this` command for chaining
   */

  hook(event, listener) {
    const allowedValues = ['preSubcommand', 'preAction', 'postAction'];
    if (!allowedValues.includes(event)) {
      throw new Error(`Unexpected value for event passed to hook : '${event}'.
Expecting one of '${allowedValues.join("', '")}'`);
    }
    if (this._lifeCycleHooks[event]) {
      this._lifeCycleHooks[event].push(listener);
    } else {
      this._lifeCycleHooks[event] = [listener];
    }
    return this;
  }

  /**
   * Register callback to use as replacement for calling process.exit.
   *
   * @param {Function} [fn] optional callback which will be passed a CommanderError, defaults to throwing
   * @return {Command} `this` command for chaining
   */

  exitOverride(fn) {
    if (fn) {
      this._exitCallback = fn;
    } else {
      this._exitCallback = (err) => {
        if (err.code !== 'commander.executeSubCommandAsync') {
          throw err;
        } else {
          // Async callback from spawn events, not useful to throw.
        }
      };
    }
    return this;
  }

  /**
   * Call process.exit, and _exitCallback if defined.
   *
   * @param {number} exitCode exit code for using with process.exit
   * @param {string} code an id string representing the error
   * @param {string} message human-readable description of the error
   * @return never
   * @private
   */

  _exit(exitCode, code, message) {
    if (this._exitCallback) {
      this._exitCallback(new CommanderError(exitCode, code, message));
      // Expecting this line is not reached.
    }
    process.exit(exitCode);
  }

  /**
   * Register callback `fn` for the command.
   *
   * @example
   * program
   *   .command('serve')
   *   .description('start service')
   *   .action(function() {
   *      // do work here
   *   });
   *
   * @param {Function} fn
   * @return {Command} `this` command for chaining
   */

  action(fn) {
    const listener = (args) => {
      // The .action callback takes an extra parameter which is the command or options.
      const expectedArgsCount = this.registeredArguments.length;
      const actionArgs = args.slice(0, expectedArgsCount);
      if (this._storeOptionsAsProperties) {
        actionArgs[expectedArgsCount] = this; // backwards compatible "options"
      } else {
        actionArgs[expectedArgsCount] = this.opts();
      }
      actionArgs.push(this);

      return fn.apply(this, actionArgs);
    };
    this._actionHandler = listener;
    return this;
  }

  /**
   * Factory routine to create a new unattached option.
   *
   * See .option() for creating an attached option, which uses this routine to
   * create the option. You can override createOption to return a custom option.
   *
   * @param {string} flags
   * @param {string} [description]
   * @return {Option} new option
   */

  createOption(flags, description) {
    return new Option(flags, description);
  }

  /**
   * Wrap parseArgs to catch 'commander.invalidArgument'.
   *
   * @param {(Option | Argument)} target
   * @param {string} value
   * @param {*} previous
   * @param {string} invalidArgumentMessage
   * @private
   */

  _callParseArg(target, value, previous, invalidArgumentMessage) {
    try {
      return target.parseArg(value, previous);
    } catch (err) {
      if (err.code === 'commander.invalidArgument') {
        const message = `${invalidArgumentMessage} ${err.message}`;
        this.error(message, { exitCode: err.exitCode, code: err.code });
      }
      throw err;
    }
  }

  /**
   * Check for option flag conflicts.
   * Register option if no conflicts found, or throw on conflict.
   *
   * @param {Option} option
   * @private
   */

  _registerOption(option) {
    const matchingOption =
      (option.short && this._findOption(option.short)) ||
      (option.long && this._findOption(option.long));
    if (matchingOption) {
      const matchingFlag =
        option.long && this._findOption(option.long)
          ? option.long
          : option.short;
      throw new Error(`Cannot add option '${option.flags}'${this._name && ` to command '${this._name}'`} due to conflicting flag '${matchingFlag}'
-  already used by option '${matchingOption.flags}'`);
    }

    this.options.push(option);
  }

  /**
   * Check for command name and alias conflicts with existing commands.
   * Register command if no conflicts found, or throw on conflict.
   *
   * @param {Command} command
   * @private
   */

  _registerCommand(command) {
    const knownBy = (cmd) => {
      return [cmd.name()].concat(cmd.aliases());
    };

    const alreadyUsed = knownBy(command).find((name) =>
      this._findCommand(name),
    );
    if (alreadyUsed) {
      const existingCmd = knownBy(this._findCommand(alreadyUsed)).join('|');
      const newCmd = knownBy(command).join('|');
      throw new Error(
        `cannot add command '${newCmd}' as already have command '${existingCmd}'`,
      );
    }

    this.commands.push(command);
  }

  /**
   * Add an option.
   *
   * @param {Option} option
   * @return {Command} `this` command for chaining
   */
  addOption(option) {
    this._registerOption(option);

    const oname = option.name();
    const name = option.attributeName();

    // store default value
    if (option.negate) {
      // --no-foo is special and defaults foo to true, unless a --foo option is already defined
      const positiveLongFlag = option.long.replace(/^--no-/, '--');
      if (!this._findOption(positiveLongFlag)) {
        this.setOptionValueWithSource(
          name,
          option.defaultValue === undefined ? true : option.defaultValue,
          'default',
        );
      }
    } else if (option.defaultValue !== undefined) {
      this.setOptionValueWithSource(name, option.defaultValue, 'default');
    }

    // handler for cli and env supplied values
    const handleOptionValue = (val, invalidValueMessage, valueSource) => {
      // val is null for optional option used without an optional-argument.
      // val is undefined for boolean and negated option.
      if (val == null && option.presetArg !== undefined) {
        val = option.presetArg;
      }

      // custom processing
      const oldValue = this.getOptionValue(name);
      if (val !== null && option.parseArg) {
        val = this._callParseArg(option, val, oldValue, invalidValueMessage);
      } else if (val !== null && option.variadic) {
        val = option._concatValue(val, oldValue);
      }

      // Fill-in appropriate missing values. Long winded but easy to follow.
      if (val == null) {
        if (option.negate) {
          val = false;
        } else if (option.isBoolean() || option.optional) {
          val = true;
        } else {
          val = ''; // not normal, parseArg might have failed or be a mock function for testing
        }
      }
      this.setOptionValueWithSource(name, val, valueSource);
    };

    this.on('option:' + oname, (val) => {
      const invalidValueMessage = `error: option '${option.flags}' argument '${val}' is invalid.`;
      handleOptionValue(val, invalidValueMessage, 'cli');
    });

    if (option.envVar) {
      this.on('optionEnv:' + oname, (val) => {
        const invalidValueMessage = `error: option '${option.flags}' value '${val}' from env '${option.envVar}' is invalid.`;
        handleOptionValue(val, invalidValueMessage, 'env');
      });
    }

    return this;
  }

  /**
   * Internal implementation shared by .option() and .requiredOption()
   *
   * @return {Command} `this` command for chaining
   * @private
   */
  _optionEx(config, flags, description, fn, defaultValue) {
    if (typeof flags === 'object' && flags instanceof Option) {
      throw new Error(
        'To add an Option object use addOption() instead of option() or requiredOption()',
      );
    }
    const option = this.createOption(flags, description);
    option.makeOptionMandatory(!!config.mandatory);
    if (typeof fn === 'function') {
      option.default(defaultValue).argParser(fn);
    } else if (fn instanceof RegExp) {
      // deprecated
      const regex = fn;
      fn = (val, def) => {
        const m = regex.exec(val);
        return m ? m[0] : def;
      };
      option.default(defaultValue).argParser(fn);
    } else {
      option.default(fn);
    }

    return this.addOption(option);
  }

  /**
   * Define option with `flags`, `description`, and optional argument parsing function or `defaultValue` or both.
   *
   * The `flags` string contains the short and/or long flags, separated by comma, a pipe or space. A required
   * option-argument is indicated by `<>` and an optional option-argument by `[]`.
   *
   * See the README for more details, and see also addOption() and requiredOption().
   *
   * @example
   * program
   *     .option('-p, --pepper', 'add pepper')
   *     .option('-p, --pizza-type <TYPE>', 'type of pizza') // required option-argument
   *     .option('-c, --cheese [CHEESE]', 'add extra cheese', 'mozzarella') // optional option-argument with default
   *     .option('-t, --tip <VALUE>', 'add tip to purchase cost', parseFloat) // custom parse function
   *
   * @param {string} flags
   * @param {string} [description]
   * @param {(Function|*)} [parseArg] - custom option processing function or default value
   * @param {*} [defaultValue]
   * @return {Command} `this` command for chaining
   */

  option(flags, description, parseArg, defaultValue) {
    return this._optionEx({}, flags, description, parseArg, defaultValue);
  }

  /**
   * Add a required option which must have a value after parsing. This usually means
   * the option must be specified on the command line. (Otherwise the same as .option().)
   *
   * The `flags` string contains the short and/or long flags, separated by comma, a pipe or space.
   *
   * @param {string} flags
   * @param {string} [description]
   * @param {(Function|*)} [parseArg] - custom option processing function or default value
   * @param {*} [defaultValue]
   * @return {Command} `this` command for chaining
   */

  requiredOption(flags, description, parseArg, defaultValue) {
    return this._optionEx(
      { mandatory: true },
      flags,
      description,
      parseArg,
      defaultValue,
    );
  }

  /**
   * Alter parsing of short flags with optional values.
   *
   * @example
   * // for `.option('-f,--flag [value]'):
   * program.combineFlagAndOptionalValue(true);  // `-f80` is treated like `--flag=80`, this is the default behaviour
   * program.combineFlagAndOptionalValue(false) // `-fb` is treated like `-f -b`
   *
   * @param {boolean} [combine] - if `true` or omitted, an optional value can be specified directly after the flag.
   * @return {Command} `this` command for chaining
   */
  combineFlagAndOptionalValue(combine = true) {
    this._combineFlagAndOptionalValue = !!combine;
    return this;
  }

  /**
   * Allow unknown options on the command line.
   *
   * @param {boolean} [allowUnknown] - if `true` or omitted, no error will be thrown for unknown options.
   * @return {Command} `this` command for chaining
   */
  allowUnknownOption(allowUnknown = true) {
    this._allowUnknownOption = !!allowUnknown;
    return this;
  }

  /**
   * Allow excess command-arguments on the command line. Pass false to make excess arguments an error.
   *
   * @param {boolean} [allowExcess] - if `true` or omitted, no error will be thrown for excess arguments.
   * @return {Command} `this` command for chaining
   */
  allowExcessArguments(allowExcess = true) {
    this._allowExcessArguments = !!allowExcess;
    return this;
  }

  /**
   * Enable positional options. Positional means global options are specified before subcommands which lets
   * subcommands reuse the same option names, and also enables subcommands to turn on passThroughOptions.
   * The default behaviour is non-positional and global options may appear anywhere on the command line.
   *
   * @param {boolean} [positional]
   * @return {Command} `this` command for chaining
   */
  enablePositionalOptions(positional = true) {
    this._enablePositionalOptions = !!positional;
    return this;
  }

  /**
   * Pass through options that come after command-arguments rather than treat them as command-options,
   * so actual command-options come before command-arguments. Turning this on for a subcommand requires
   * positional options to have been enabled on the program (parent commands).
   * The default behaviour is non-positional and options may appear before or after command-arguments.
   *
   * @param {boolean} [passThrough] for unknown options.
   * @return {Command} `this` command for chaining
   */
  passThroughOptions(passThrough = true) {
    this._passThroughOptions = !!passThrough;
    this._checkForBrokenPassThrough();
    return this;
  }

  /**
   * @private
   */

  _checkForBrokenPassThrough() {
    if (
      this.parent &&
      this._passThroughOptions &&
      !this.parent._enablePositionalOptions
    ) {
      throw new Error(
        `passThroughOptions cannot be used for '${this._name}' without turning on enablePositionalOptions for parent command(s)`,
      );
    }
  }

  /**
   * Whether to store option values as properties on command object,
   * or store separately (specify false). In both cases the option values can be accessed using .opts().
   *
   * @param {boolean} [storeAsProperties=true]
   * @return {Command} `this` command for chaining
   */

  storeOptionsAsProperties(storeAsProperties = true) {
    if (this.options.length) {
      throw new Error('call .storeOptionsAsProperties() before adding options');
    }
    if (Object.keys(this._optionValues).length) {
      throw new Error(
        'call .storeOptionsAsProperties() before setting option values',
      );
    }
    this._storeOptionsAsProperties = !!storeAsProperties;
    return this;
  }

  /**
   * Retrieve option value.
   *
   * @param {string} key
   * @return {object} value
   */

  getOptionValue(key) {
    if (this._storeOptionsAsProperties) {
      return this[key];
    }
    return this._optionValues[key];
  }

  /**
   * Store option value.
   *
   * @param {string} key
   * @param {object} value
   * @return {Command} `this` command for chaining
   */

  setOptionValue(key, value) {
    return this.setOptionValueWithSource(key, value, undefined);
  }

  /**
   * Store option value and where the value came from.
   *
   * @param {string} key
   * @param {object} value
   * @param {string} source - expected values are default/config/env/cli/implied
   * @return {Command} `this` command for chaining
   */

  setOptionValueWithSource(key, value, source) {
    if (this._storeOptionsAsProperties) {
      this[key] = value;
    } else {
      this._optionValues[key] = value;
    }
    this._optionValueSources[key] = source;
    return this;
  }

  /**
   * Get source of option value.
   * Expected values are default | config | env | cli | implied
   *
   * @param {string} key
   * @return {string}
   */

  getOptionValueSource(key) {
    return this._optionValueSources[key];
  }

  /**
   * Get source of option value. See also .optsWithGlobals().
   * Expected values are default | config | env | cli | implied
   *
   * @param {string} key
   * @return {string}
   */

  getOptionValueSourceWithGlobals(key) {
    // global overwrites local, like optsWithGlobals
    let source;
    this._getCommandAndAncestors().forEach((cmd) => {
      if (cmd.getOptionValueSource(key) !== undefined) {
        source = cmd.getOptionValueSource(key);
      }
    });
    return source;
  }

  /**
   * Get user arguments from implied or explicit arguments.
   * Side-effects: set _scriptPath if args included script. Used for default program name, and subcommand searches.
   *
   * @private
   */

  _prepareUserArgs(argv, parseOptions) {
    if (argv !== undefined && !Array.isArray(argv)) {
      throw new Error('first parameter to parse must be array or undefined');
    }
    parseOptions = parseOptions || {};

    // auto-detect argument conventions if nothing supplied
    if (argv === undefined && parseOptions.from === undefined) {
      if (process.versions?.electron) {
        parseOptions.from = 'electron';
      }
      // check node specific options for scenarios where user CLI args follow executable without scriptname
      const execArgv = process.execArgv ?? [];
      if (
        execArgv.includes('-e') ||
        execArgv.includes('--eval') ||
        execArgv.includes('-p') ||
        execArgv.includes('--print')
      ) {
        parseOptions.from = 'eval'; // internal usage, not documented
      }
    }

    // default to using process.argv
    if (argv === undefined) {
      argv = process.argv;
    }
    this.rawArgs = argv.slice();

    // extract the user args and scriptPath
    let userArgs;
    switch (parseOptions.from) {
      case undefined:
      case 'node':
        this._scriptPath = argv[1];
        userArgs = argv.slice(2);
        break;
      case 'electron':
        // @ts-ignore: because defaultApp is an unknown property
        if (process.defaultApp) {
          this._scriptPath = argv[1];
          userArgs = argv.slice(2);
        } else {
          userArgs = argv.slice(1);
        }
        break;
      case 'user':
        userArgs = argv.slice(0);
        break;
      case 'eval':
        userArgs = argv.slice(1);
        break;
      default:
        throw new Error(
          `unexpected parse option { from: '${parseOptions.from}' }`,
        );
    }

    // Find default name for program from arguments.
    if (!this._name && this._scriptPath)
      this.nameFromFilename(this._scriptPath);
    this._name = this._name || 'program';

    return userArgs;
  }

  /**
   * Parse `argv`, setting options and invoking commands when defined.
   *
   * Use parseAsync instead of parse if any of your action handlers are async.
   *
   * Call with no parameters to parse `process.argv`. Detects Electron and special node options like `node --eval`. Easy mode!
   *
   * Or call with an array of strings to parse, and optionally where the user arguments start by specifying where the arguments are `from`:
   * - `'node'`: default, `argv[0]` is the application and `argv[1]` is the script being run, with user arguments after that
   * - `'electron'`: `argv[0]` is the application and `argv[1]` varies depending on whether the electron application is packaged
   * - `'user'`: just user arguments
   *
   * @example
   * program.parse(); // parse process.argv and auto-detect electron and special node flags
   * program.parse(process.argv); // assume argv[0] is app and argv[1] is script
   * program.parse(my-args, { from: 'user' }); // just user supplied arguments, nothing special about argv[0]
   *
   * @param {string[]} [argv] - optional, defaults to process.argv
   * @param {object} [parseOptions] - optionally specify style of options with from: node/user/electron
   * @param {string} [parseOptions.from] - where the args are from: 'node', 'user', 'electron'
   * @return {Command} `this` command for chaining
   */

  parse(argv, parseOptions) {
    const userArgs = this._prepareUserArgs(argv, parseOptions);
    this._parseCommand([], userArgs);

    return this;
  }

  /**
   * Parse `argv`, setting options and invoking commands when defined.
   *
   * Call with no parameters to parse `process.argv`. Detects Electron and special node options like `node --eval`. Easy mode!
   *
   * Or call with an array of strings to parse, and optionally where the user arguments start by specifying where the arguments are `from`:
   * - `'node'`: default, `argv[0]` is the application and `argv[1]` is the script being run, with user arguments after that
   * - `'electron'`: `argv[0]` is the application and `argv[1]` varies depending on whether the electron application is packaged
   * - `'user'`: just user arguments
   *
   * @example
   * await program.parseAsync(); // parse process.argv and auto-detect electron and special node flags
   * await program.parseAsync(process.argv); // assume argv[0] is app and argv[1] is script
   * await program.parseAsync(my-args, { from: 'user' }); // just user supplied arguments, nothing special about argv[0]
   *
   * @param {string[]} [argv]
   * @param {object} [parseOptions]
   * @param {string} parseOptions.from - where the args are from: 'node', 'user', 'electron'
   * @return {Promise}
   */

  async parseAsync(argv, parseOptions) {
    const userArgs = this._prepareUserArgs(argv, parseOptions);
    await this._parseCommand([], userArgs);

    return this;
  }

  /**
   * Execute a sub-command executable.
   *
   * @private
   */

  _executeSubCommand(subcommand, args) {
    args = args.slice();
    let launchWithNode = false; // Use node for source targets so do not need to get permissions correct, and on Windows.
    const sourceExt = ['.js', '.ts', '.tsx', '.mjs', '.cjs'];

    function findFile(baseDir, baseName) {
      // Look for specified file
      const localBin = path.resolve(baseDir, baseName);
      if (fs.existsSync(localBin)) return localBin;

      // Stop looking if candidate already has an expected extension.
      if (sourceExt.includes(path.extname(baseName))) return undefined;

      // Try all the extensions.
      const foundExt = sourceExt.find((ext) =>
        fs.existsSync(`${localBin}${ext}`),
      );
      if (foundExt) return `${localBin}${foundExt}`;

      return undefined;
    }

    // Not checking for help first. Unlikely to have mandatory and executable, and can't robustly test for help flags in external command.
    this._checkForMissingMandatoryOptions();
    this._checkForConflictingOptions();

    // executableFile and executableDir might be full path, or just a name
    let executableFile =
      subcommand._executableFile || `${this._name}-${subcommand._name}`;
    let executableDir = this._executableDir || '';
    if (this._scriptPath) {
      let resolvedScriptPath; // resolve possible symlink for installed npm binary
      try {
        resolvedScriptPath = fs.realpathSync(this._scriptPath);
      } catch (err) {
        resolvedScriptPath = this._scriptPath;
      }
      executableDir = path.resolve(
        path.dirname(resolvedScriptPath),
        executableDir,
      );
    }

    // Look for a local file in preference to a command in PATH.
    if (executableDir) {
      let localFile = findFile(executableDir, executableFile);

      // Legacy search using prefix of script name instead of command name
      if (!localFile && !subcommand._executableFile && this._scriptPath) {
        const legacyName = path.basename(
          this._scriptPath,
          path.extname(this._scriptPath),
        );
        if (legacyName !== this._name) {
          localFile = findFile(
            executableDir,
            `${legacyName}-${subcommand._name}`,
          );
        }
      }
      executableFile = localFile || executableFile;
    }

    launchWithNode = sourceExt.includes(path.extname(executableFile));

    let proc;
    if (process.platform !== 'win32') {
      if (launchWithNode) {
        args.unshift(executableFile);
        // add executable arguments to spawn
        args = incrementNodeInspectorPort(process.execArgv).concat(args);

        proc = childProcess.spawn(process.argv[0], args, { stdio: 'inherit' });
      } else {
        proc = childProcess.spawn(executableFile, args, { stdio: 'inherit' });
      }
    } else {
      args.unshift(executableFile);
      // add executable arguments to spawn
      args = incrementNodeInspectorPort(process.execArgv).concat(args);
      proc = childProcess.spawn(process.execPath, args, { stdio: 'inherit' });
    }

    if (!proc.killed) {
      // testing mainly to avoid leak warnings during unit tests with mocked spawn
      const signals = ['SIGUSR1', 'SIGUSR2', 'SIGTERM', 'SIGINT', 'SIGHUP'];
      signals.forEach((signal) => {
        process.on(signal, () => {
          if (proc.killed === false && proc.exitCode === null) {
            // @ts-ignore because signals not typed to known strings
            proc.kill(signal);
          }
        });
      });
    }

    // By default terminate process when spawned process terminates.
    const exitCallback = this._exitCallback;
    proc.on('close', (code) => {
      code = code ?? 1; // code is null if spawned process terminated due to a signal
      if (!exitCallback) {
        process.exit(code);
      } else {
        exitCallback(
          new CommanderError(
            code,
            'commander.executeSubCommandAsync',
            '(close)',
          ),
        );
      }
    });
    proc.on('error', (err) => {
      // @ts-ignore: because err.code is an unknown property
      if (err.code === 'ENOENT') {
        const executableDirMessage = executableDir
          ? `searched for local subcommand relative to directory '${executableDir}'`
          : 'no directory for search for local subcommand, use .executableDir() to supply a custom directory';
        const executableMissing = `'${executableFile}' does not exist
 - if '${subcommand._name}' is not meant to be an executable command, remove description parameter from '.command()' and use '.description()' instead
 - if the default executable name is not suitable, use the executableFile option to supply a custom name or path
 - ${executableDirMessage}`;
        throw new Error(executableMissing);
        // @ts-ignore: because err.code is an unknown property
      } else if (err.code === 'EACCES') {
        throw new Error(`'${executableFile}' not executable`);
      }
      if (!exitCallback) {
        process.exit(1);
      } else {
        const wrappedError = new CommanderError(
          1,
          'commander.executeSubCommandAsync',
          '(error)',
        );
        wrappedError.nestedError = err;
        exitCallback(wrappedError);
      }
    });

    // Store the reference to the child process
    this.runningCommand = proc;
  }

  /**
   * @private
   */

  _dispatchSubcommand(commandName, operands, unknown) {
    const subCommand = this._findCommand(commandName);
    if (!subCommand) this.help({ error: true });

    let promiseChain;
    promiseChain = this._chainOrCallSubCommandHook(
      promiseChain,
      subCommand,
      'preSubcommand',
    );
    promiseChain = this._chainOrCall(promiseChain, () => {
      if (subCommand._executableHandler) {
        this._executeSubCommand(subCommand, operands.concat(unknown));
      } else {
        return subCommand._parseCommand(operands, unknown);
      }
    });
    return promiseChain;
  }

  /**
   * Invoke help directly if possible, or dispatch if necessary.
   * e.g. help foo
   *
   * @private
   */

  _dispatchHelpCommand(subcommandName) {
    if (!subcommandName) {
      this.help();
    }
    const subCommand = this._findCommand(subcommandName);
    if (subCommand && !subCommand._executableHandler) {
      subCommand.help();
    }

    // Fallback to parsing the help flag to invoke the help.
    return this._dispatchSubcommand(
      subcommandName,
      [],
      [this._getHelpOption()?.long ?? this._getHelpOption()?.short ?? '--help'],
    );
  }

  /**
   * Check this.args against expected this.registeredArguments.
   *
   * @private
   */

  _checkNumberOfArguments() {
    // too few
    this.registeredArguments.forEach((arg, i) => {
      if (arg.required && this.args[i] == null) {
        this.missingArgument(arg.name());
      }
    });
    // too many
    if (
      this.registeredArguments.length > 0 &&
      this.registeredArguments[this.registeredArguments.length - 1].variadic
    ) {
      return;
    }
    if (this.args.length > this.registeredArguments.length) {
      this._excessArguments(this.args);
    }
  }

  /**
   * Process this.args using this.registeredArguments and save as this.processedArgs!
   *
   * @private
   */

  _processArguments() {
    const myParseArg = (argument, value, previous) => {
      // Extra processing for nice error message on parsing failure.
      let parsedValue = value;
      if (value !== null && argument.parseArg) {
        const invalidValueMessage = `error: command-argument value '${value}' is invalid for argument '${argument.name()}'.`;
        parsedValue = this._callParseArg(
          argument,
          value,
          previous,
          invalidValueMessage,
        );
      }
      return parsedValue;
    };

    this._checkNumberOfArguments();

    const processedArgs = [];
    this.registeredArguments.forEach((declaredArg, index) => {
      let value = declaredArg.defaultValue;
      if (declaredArg.variadic) {
        // Collect together remaining arguments for passing together as an array.
        if (index < this.args.length) {
          value = this.args.slice(index);
          if (declaredArg.parseArg) {
            value = value.reduce((processed, v) => {
              return myParseArg(declaredArg, v, processed);
            }, declaredArg.defaultValue);
          }
        } else if (value === undefined) {
          value = [];
        }
      } else if (index < this.args.length) {
        value = this.args[index];
        if (declaredArg.parseArg) {
          value = myParseArg(declaredArg, value, declaredArg.defaultValue);
        }
      }
      processedArgs[index] = value;
    });
    this.processedArgs = processedArgs;
  }

  /**
   * Once we have a promise we chain, but call synchronously until then.
   *
   * @param {(Promise|undefined)} promise
   * @param {Function} fn
   * @return {(Promise|undefined)}
   * @private
   */

  _chainOrCall(promise, fn) {
    // thenable
    if (promise && promise.then && typeof promise.then === 'function') {
      // already have a promise, chain callback
      return promise.then(() => fn());
    }
    // callback might return a promise
    return fn();
  }

  /**
   *
   * @param {(Promise|undefined)} promise
   * @param {string} event
   * @return {(Promise|undefined)}
   * @private
   */

  _chainOrCallHooks(promise, event) {
    let result = promise;
    const hooks = [];
    this._getCommandAndAncestors()
      .reverse()
      .filter((cmd) => cmd._lifeCycleHooks[event] !== undefined)
      .forEach((hookedCommand) => {
        hookedCommand._lifeCycleHooks[event].forEach((callback) => {
          hooks.push({ hookedCommand, callback });
        });
      });
    if (event === 'postAction') {
      hooks.reverse();
    }

    hooks.forEach((hookDetail) => {
      result = this._chainOrCall(result, () => {
        return hookDetail.callback(hookDetail.hookedCommand, this);
      });
    });
    return result;
  }

  /**
   *
   * @param {(Promise|undefined)} promise
   * @param {Command} subCommand
   * @param {string} event
   * @return {(Promise|undefined)}
   * @private
   */

  _chainOrCallSubCommandHook(promise, subCommand, event) {
    let result = promise;
    if (this._lifeCycleHooks[event] !== undefined) {
      this._lifeCycleHooks[event].forEach((hook) => {
        result = this._chainOrCall(result, () => {
          return hook(this, subCommand);
        });
      });
    }
    return result;
  }

  /**
   * Process arguments in context of this command.
   * Returns action result, in case it is a promise.
   *
   * @private
   */

  _parseCommand(operands, unknown) {
    const parsed = this.parseOptions(unknown);
    this._parseOptionsEnv(); // after cli, so parseArg not called on both cli and env
    this._parseOptionsImplied();
    operands = operands.concat(parsed.operands);
    unknown = parsed.unknown;
    this.args = operands.concat(unknown);

    if (operands && this._findCommand(operands[0])) {
      return this._dispatchSubcommand(operands[0], operands.slice(1), unknown);
    }
    if (
      this._getHelpCommand() &&
      operands[0] === this._getHelpCommand().name()
    ) {
      return this._dispatchHelpCommand(operands[1]);
    }
    if (this._defaultCommandName) {
      this._outputHelpIfRequested(unknown); // Run the help for default command from parent rather than passing to default command
      return this._dispatchSubcommand(
        this._defaultCommandName,
        operands,
        unknown,
      );
    }
    if (
      this.commands.length &&
      this.args.length === 0 &&
      !this._actionHandler &&
      !this._defaultCommandName
    ) {
      // probably missing subcommand and no handler, user needs help (and exit)
      this.help({ error: true });
    }

    this._outputHelpIfRequested(parsed.unknown);
    this._checkForMissingMandatoryOptions();
    this._checkForConflictingOptions();

    // We do not always call this check to avoid masking a "better" error, like unknown command.
    const checkForUnknownOptions = () => {
      if (parsed.unknown.length > 0) {
        this.unknownOption(parsed.unknown[0]);
      }
    };

    const commandEvent = `command:${this.name()}`;
    if (this._actionHandler) {
      checkForUnknownOptions();
      this._processArguments();

      let promiseChain;
      promiseChain = this._chainOrCallHooks(promiseChain, 'preAction');
      promiseChain = this._chainOrCall(promiseChain, () =>
        this._actionHandler(this.processedArgs),
      );
      if (this.parent) {
        promiseChain = this._chainOrCall(promiseChain, () => {
          this.parent.emit(commandEvent, operands, unknown); // legacy
        });
      }
      promiseChain = this._chainOrCallHooks(promiseChain, 'postAction');
      return promiseChain;
    }
    if (this.parent && this.parent.listenerCount(commandEvent)) {
      checkForUnknownOptions();
      this._processArguments();
      this.parent.emit(commandEvent, operands, unknown); // legacy
    } else if (operands.length) {
      if (this._findCommand('*')) {
        // legacy default command
        return this._dispatchSubcommand('*', operands, unknown);
      }
      if (this.listenerCount('command:*')) {
        // skip option check, emit event for possible misspelling suggestion
        this.emit('command:*', operands, unknown);
      } else if (this.commands.length) {
        this.unknownCommand();
      } else {
        checkForUnknownOptions();
        this._processArguments();
      }
    } else if (this.commands.length) {
      checkForUnknownOptions();
      // This command has subcommands and nothing hooked up at this level, so display help (and exit).
      this.help({ error: true });
    } else {
      checkForUnknownOptions();
      this._processArguments();
      // fall through for caller to handle after calling .parse()
    }
  }

  /**
   * Find matching command.
   *
   * @private
   * @return {Command | undefined}
   */
  _findCommand(name) {
    if (!name) return undefined;
    return this.commands.find(
      (cmd) => cmd._name === name || cmd._aliases.includes(name),
    );
  }

  /**
   * Return an option matching `arg` if any.
   *
   * @param {string} arg
   * @return {Option}
   * @package
   */

  _findOption(arg) {
    return this.options.find((option) => option.is(arg));
  }

  /**
   * Display an error message if a mandatory option does not have a value.
   * Called after checking for help flags in leaf subcommand.
   *
   * @private
   */

  _checkForMissingMandatoryOptions() {
    // Walk up hierarchy so can call in subcommand after checking for displaying help.
    this._getCommandAndAncestors().forEach((cmd) => {
      cmd.options.forEach((anOption) => {
        if (
          anOption.mandatory &&
          cmd.getOptionValue(anOption.attributeName()) === undefined
        ) {
          cmd.missingMandatoryOptionValue(anOption);
        }
      });
    });
  }

  /**
   * Display an error message if conflicting options are used together in this.
   *
   * @private
   */
  _checkForConflictingLocalOptions() {
    const definedNonDefaultOptions = this.options.filter((option) => {
      const optionKey = option.attributeName();
      if (this.getOptionValue(optionKey) === undefined) {
        return false;
      }
      return this.getOptionValueSource(optionKey) !== 'default';
    });

    const optionsWithConflicting = definedNonDefaultOptions.filter(
      (option) => option.conflictsWith.length > 0,
    );

    optionsWithConflicting.forEach((option) => {
      const conflictingAndDefined = definedNonDefaultOptions.find((defined) =>
        option.conflictsWith.includes(defined.attributeName()),
      );
      if (conflictingAndDefined) {
        this._conflictingOption(option, conflictingAndDefined);
      }
    });
  }

  /**
   * Display an error message if conflicting options are used together.
   * Called after checking for help flags in leaf subcommand.
   *
   * @private
   */
  _checkForConflictingOptions() {
    // Walk up hierarchy so can call in subcommand after checking for displaying help.
    this._getCommandAndAncestors().forEach((cmd) => {
      cmd._checkForConflictingLocalOptions();
    });
  }

  /**
   * Parse options from `argv` removing known options,
   * and return argv split into operands and unknown arguments.
   *
   * Examples:
   *
   *     argv => operands, unknown
   *     --known kkk op => [op], []
   *     op --known kkk => [op], []
   *     sub --unknown uuu op => [sub], [--unknown uuu op]
   *     sub -- --unknown uuu op => [sub --unknown uuu op], []
   *
   * @param {string[]} argv
   * @return {{operands: string[], unknown: string[]}}
   */

  parseOptions(argv) {
    const operands = []; // operands, not options or values
    const unknown = []; // first unknown option and remaining unknown args
    let dest = operands;
    const args = argv.slice();

    function maybeOption(arg) {
      return arg.length > 1 && arg[0] === '-';
    }

    // parse options
    let activeVariadicOption = null;
    while (args.length) {
      const arg = args.shift();

      // literal
      if (arg === '--') {
        if (dest === unknown) dest.push(arg);
        dest.push(...args);
        break;
      }

      if (activeVariadicOption && !maybeOption(arg)) {
        this.emit(`option:${activeVariadicOption.name()}`, arg);
        continue;
      }
      activeVariadicOption = null;

      if (maybeOption(arg)) {
        const option = this._findOption(arg);
        // recognised option, call listener to assign value with possible custom processing
        if (option) {
          if (option.required) {
            const value = args.shift();
            if (value === undefined) this.optionMissingArgument(option);
            this.emit(`option:${option.name()}`, value);
          } else if (option.optional) {
            let value = null;
            // historical behaviour is optional value is following arg unless an option
            if (args.length > 0 && !maybeOption(args[0])) {
              value = args.shift();
            }
            this.emit(`option:${option.name()}`, value);
          } else {
            // boolean flag
            this.emit(`option:${option.name()}`);
          }
          activeVariadicOption = option.variadic ? option : null;
          continue;
        }
      }

      // Look for combo options following single dash, eat first one if known.
      if (arg.length > 2 && arg[0] === '-' && arg[1] !== '-') {
        const option = this._findOption(`-${arg[1]}`);
        if (option) {
          if (
            option.required ||
            (option.optional && this._combineFlagAndOptionalValue)
          ) {
            // option with value following in same argument
            this.emit(`option:${option.name()}`, arg.slice(2));
          } else {
            // boolean option, emit and put back remainder of arg for further processing
            this.emit(`option:${option.name()}`);
            args.unshift(`-${arg.slice(2)}`);
          }
          continue;
        }
      }

      // Look for known long flag with value, like --foo=bar
      if (/^--[^=]+=/.test(arg)) {
        const index = arg.indexOf('=');
        const option = this._findOption(arg.slice(0, index));
        if (option && (option.required || option.optional)) {
          this.emit(`option:${option.name()}`, arg.slice(index + 1));
          continue;
        }
      }

      // Not a recognised option by this command.
      // Might be a command-argument, or subcommand option, or unknown option, or help command or option.

      // An unknown option means further arguments also classified as unknown so can be reprocessed by subcommands.
      if (maybeOption(arg)) {
        dest = unknown;
      }

      // If using positionalOptions, stop processing our options at subcommand.
      if (
        (this._enablePositionalOptions || this._passThroughOptions) &&
        operands.length === 0 &&
        unknown.length === 0
      ) {
        if (this._findCommand(arg)) {
          operands.push(arg);
          if (args.length > 0) unknown.push(...args);
          break;
        } else if (
          this._getHelpCommand() &&
          arg === this._getHelpCommand().name()
        ) {
          operands.push(arg);
          if (args.length > 0) operands.push(...args);
          break;
        } else if (this._defaultCommandName) {
          unknown.push(arg);
          if (args.length > 0) unknown.push(...args);
          break;
        }
      }

      // If using passThroughOptions, stop processing options at first command-argument.
      if (this._passThroughOptions) {
        dest.push(arg);
        if (args.length > 0) dest.push(...args);
        break;
      }

      // add arg
      dest.push(arg);
    }

    return { operands, unknown };
  }

  /**
   * Return an object containing local option values as key-value pairs.
   *
   * @return {object}
   */
  opts() {
    if (this._storeOptionsAsProperties) {
      // Preserve original behaviour so backwards compatible when still using properties
      const result = {};
      const len = this.options.length;

      for (let i = 0; i < len; i++) {
        const key = this.options[i].attributeName();
        result[key] =
          key === this._versionOptionName ? this._version : this[key];
      }
      return result;
    }

    return this._optionValues;
  }

  /**
   * Return an object containing merged local and global option values as key-value pairs.
   *
   * @return {object}
   */
  optsWithGlobals() {
    // globals overwrite locals
    return this._getCommandAndAncestors().reduce(
      (combinedOptions, cmd) => Object.assign(combinedOptions, cmd.opts()),
      {},
    );
  }

  /**
   * Display error message and exit (or call exitOverride).
   *
   * @param {string} message
   * @param {object} [errorOptions]
   * @param {string} [errorOptions.code] - an id string representing the error
   * @param {number} [errorOptions.exitCode] - used with process.exit
   */
  error(message, errorOptions) {
    // output handling
    this._outputConfiguration.outputError(
      `${message}\n`,
      this._outputConfiguration.writeErr,
    );
    if (typeof this._showHelpAfterError === 'string') {
      this._outputConfiguration.writeErr(`${this._showHelpAfterError}\n`);
    } else if (this._showHelpAfterError) {
      this._outputConfiguration.writeErr('\n');
      this.outputHelp({ error: true });
    }

    // exit handling
    const config = errorOptions || {};
    const exitCode = config.exitCode || 1;
    const code = config.code || 'commander.error';
    this._exit(exitCode, code, message);
  }

  /**
   * Apply any option related environment variables, if option does
   * not have a value from cli or client code.
   *
   * @private
   */
  _parseOptionsEnv() {
    this.options.forEach((option) => {
      if (option.envVar && option.envVar in process.env) {
        const optionKey = option.attributeName();
        // Priority check. Do not overwrite cli or options from unknown source (client-code).
        if (
          this.getOptionValue(optionKey) === undefined ||
          ['default', 'config', 'env'].includes(
            this.getOptionValueSource(optionKey),
          )
        ) {
          if (option.required || option.optional) {
            // option can take a value
            // keep very simple, optional always takes value
            this.emit(`optionEnv:${option.name()}`, process.env[option.envVar]);
          } else {
            // boolean
            // keep very simple, only care that envVar defined and not the value
            this.emit(`optionEnv:${option.name()}`);
          }
        }
      }
    });
  }

  /**
   * Apply any implied option values, if option is undefined or default value.
   *
   * @private
   */
  _parseOptionsImplied() {
    const dualHelper = new DualOptions(this.options);
    const hasCustomOptionValue = (optionKey) => {
      return (
        this.getOptionValue(optionKey) !== undefined &&
        !['default', 'implied'].includes(this.getOptionValueSource(optionKey))
      );
    };
    this.options
      .filter(
        (option) =>
          option.implied !== undefined &&
          hasCustomOptionValue(option.attributeName()) &&
          dualHelper.valueFromOption(
            this.getOptionValue(option.attributeName()),
            option,
          ),
      )
      .forEach((option) => {
        Object.keys(option.implied)
          .filter((impliedKey) => !hasCustomOptionValue(impliedKey))
          .forEach((impliedKey) => {
            this.setOptionValueWithSource(
              impliedKey,
              option.implied[impliedKey],
              'implied',
            );
          });
      });
  }

  /**
   * Argument `name` is missing.
   *
   * @param {string} name
   * @private
   */

  missingArgument(name) {
    const message = `error: missing required argument '${name}'`;
    this.error(message, { code: 'commander.missingArgument' });
  }

  /**
   * `Option` is missing an argument.
   *
   * @param {Option} option
   * @private
   */

  optionMissingArgument(option) {
    const message = `error: option '${option.flags}' argument missing`;
    this.error(message, { code: 'commander.optionMissingArgument' });
  }

  /**
   * `Option` does not have a value, and is a mandatory option.
   *
   * @param {Option} option
   * @private
   */

  missingMandatoryOptionValue(option) {
    const message = `error: required option '${option.flags}' not specified`;
    this.error(message, { code: 'commander.missingMandatoryOptionValue' });
  }

  /**
   * `Option` conflicts with another option.
   *
   * @param {Option} option
   * @param {Option} conflictingOption
   * @private
   */
  _conflictingOption(option, conflictingOption) {
    // The calling code does not know whether a negated option is the source of the
    // value, so do some work to take an educated guess.
    const findBestOptionFromValue = (option) => {
      const optionKey = option.attributeName();
      const optionValue = this.getOptionValue(optionKey);
      const negativeOption = this.options.find(
        (target) => target.negate && optionKey === target.attributeName(),
      );
      const positiveOption = this.options.find(
        (target) => !target.negate && optionKey === target.attributeName(),
      );
      if (
        negativeOption &&
        ((negativeOption.presetArg === undefined && optionValue === false) ||
          (negativeOption.presetArg !== undefined &&
            optionValue === negativeOption.presetArg))
      ) {
        return negativeOption;
      }
      return positiveOption || option;
    };

    const getErrorMessage = (option) => {
      const bestOption = findBestOptionFromValue(option);
      const optionKey = bestOption.attributeName();
      const source = this.getOptionValueSource(optionKey);
      if (source === 'env') {
        return `environment variable '${bestOption.envVar}'`;
      }
      return `option '${bestOption.flags}'`;
    };

    const message = `error: ${getErrorMessage(option)} cannot be used with ${getErrorMessage(conflictingOption)}`;
    this.error(message, { code: 'commander.conflictingOption' });
  }

  /**
   * Unknown option `flag`.
   *
   * @param {string} flag
   * @private
   */

  unknownOption(flag) {
    if (this._allowUnknownOption) return;
    let suggestion = '';

    if (flag.startsWith('--') && this._showSuggestionAfterError) {
      // Looping to pick up the global options too
      let candidateFlags = [];
      // eslint-disable-next-line @typescript-eslint/no-this-alias
      let command = this;
      do {
        const moreFlags = command
          .createHelp()
          .visibleOptions(command)
          .filter((option) => option.long)
          .map((option) => option.long);
        candidateFlags = candidateFlags.concat(moreFlags);
        command = command.parent;
      } while (command && !command._enablePositionalOptions);
      suggestion = suggestSimilar(flag, candidateFlags);
    }

    const message = `error: unknown option '${flag}'${suggestion}`;
    this.error(message, { code: 'commander.unknownOption' });
  }

  /**
   * Excess arguments, more than expected.
   *
   * @param {string[]} receivedArgs
   * @private
   */

  _excessArguments(receivedArgs) {
    if (this._allowExcessArguments) return;

    const expected = this.registeredArguments.length;
    const s = expected === 1 ? '' : 's';
    const forSubcommand = this.parent ? ` for '${this.name()}'` : '';
    const message = `error: too many arguments${forSubcommand}. Expected ${expected} argument${s} but got ${receivedArgs.length}.`;
    this.error(message, { code: 'commander.excessArguments' });
  }

  /**
   * Unknown command.
   *
   * @private
   */

  unknownCommand() {
    const unknownName = this.args[0];
    let suggestion = '';

    if (this._showSuggestionAfterError) {
      const candidateNames = [];
      this.createHelp()
        .visibleCommands(this)
        .forEach((command) => {
          candidateNames.push(command.name());
          // just visible alias
          if (command.alias()) candidateNames.push(command.alias());
        });
      suggestion = suggestSimilar(unknownName, candidateNames);
    }

    const message = `error: unknown command '${unknownName}'${suggestion}`;
    this.error(message, { code: 'commander.unknownCommand' });
  }

  /**
   * Get or set the program version.
   *
   * This method auto-registers the "-V, --version" option which will print the version number.
   *
   * You can optionally supply the flags and description to override the defaults.
   *
   * @param {string} [str]
   * @param {string} [flags]
   * @param {string} [description]
   * @return {(this | string | undefined)} `this` command for chaining, or version string if no arguments
   */

  version(str, flags, description) {
    if (str === undefined) return this._version;
    this._version = str;
    flags = flags || '-V, --version';
    description = description || 'output the version number';
    const versionOption = this.createOption(flags, description);
    this._versionOptionName = versionOption.attributeName();
    this._registerOption(versionOption);

    this.on('option:' + versionOption.name(), () => {
      this._outputConfiguration.writeOut(`${str}\n`);
      this._exit(0, 'commander.version', str);
    });
    return this;
  }

  /**
   * Set the description.
   *
   * @param {string} [str]
   * @param {object} [argsDescription]
   * @return {(string|Command)}
   */
  description(str, argsDescription) {
    if (str === undefined && argsDescription === undefined)
      return this._description;
    this._description = str;
    if (argsDescription) {
      this._argsDescription = argsDescription;
    }
    return this;
  }

  /**
   * Set the summary. Used when listed as subcommand of parent.
   *
   * @param {string} [str]
   * @return {(string|Command)}
   */
  summary(str) {
    if (str === undefined) return this._summary;
    this._summary = str;
    return this;
  }

  /**
   * Set an alias for the command.
   *
   * You may call more than once to add multiple aliases. Only the first alias is shown in the auto-generated help.
   *
   * @param {string} [alias]
   * @return {(string|Command)}
   */

  alias(alias) {
    if (alias === undefined) return this._aliases[0]; // just return first, for backwards compatibility

    /** @type {Command} */
    // eslint-disable-next-line @typescript-eslint/no-this-alias
    let command = this;
    if (
      this.commands.length !== 0 &&
      this.commands[this.commands.length - 1]._executableHandler
    ) {
      // assume adding alias for last added executable subcommand, rather than this
      command = this.commands[this.commands.length - 1];
    }

    if (alias === command._name)
      throw new Error("Command alias can't be the same as its name");
    const matchingCommand = this.parent?._findCommand(alias);
    if (matchingCommand) {
      // c.f. _registerCommand
      const existingCmd = [matchingCommand.name()]
        .concat(matchingCommand.aliases())
        .join('|');
      throw new Error(
        `cannot add alias '${alias}' to command '${this.name()}' as already have command '${existingCmd}'`,
      );
    }

    command._aliases.push(alias);
    return this;
  }

  /**
   * Set aliases for the command.
   *
   * Only the first alias is shown in the auto-generated help.
   *
   * @param {string[]} [aliases]
   * @return {(string[]|Command)}
   */

  aliases(aliases) {
    // Getter for the array of aliases is the main reason for having aliases() in addition to alias().
    if (aliases === undefined) return this._aliases;

    aliases.forEach((alias) => this.alias(alias));
    return this;
  }

  /**
   * Set / get the command usage `str`.
   *
   * @param {string} [str]
   * @return {(string|Command)}
   */

  usage(str) {
    if (str === undefined) {
      if (this._usage) return this._usage;

      const args = this.registeredArguments.map((arg) => {
        return humanReadableArgName(arg);
      });
      return []
        .concat(
          this.options.length || this._helpOption !== null ? '[options]' : [],
          this.commands.length ? '[command]' : [],
          this.registeredArguments.length ? args : [],
        )
        .join(' ');
    }

    this._usage = str;
    return this;
  }

  /**
   * Get or set the name of the command.
   *
   * @param {string} [str]
   * @return {(string|Command)}
   */

  name(str) {
    if (str === undefined) return this._name;
    this._name = str;
    return this;
  }

  /**
   * Set the name of the command from script filename, such as process.argv[1],
   * or require.main.filename, or __filename.
   *
   * (Used internally and public although not documented in README.)
   *
   * @example
   * program.nameFromFilename(require.main.filename);
   *
   * @param {string} filename
   * @return {Command}
   */

  nameFromFilename(filename) {
    this._name = path.basename(filename, path.extname(filename));

    return this;
  }

  /**
   * Get or set the directory for searching for executable subcommands of this command.
   *
   * @example
   * program.executableDir(__dirname);
   * // or
   * program.executableDir('subcommands');
   *
   * @param {string} [path]
   * @return {(string|null|Command)}
   */

  executableDir(path) {
    if (path === undefined) return this._executableDir;
    this._executableDir = path;
    return this;
  }

  /**
   * Return program help documentation.
   *
   * @param {{ error: boolean }} [contextOptions] - pass {error:true} to wrap for stderr instead of stdout
   * @return {string}
   */

  helpInformation(contextOptions) {
    const helper = this.createHelp();
    if (helper.helpWidth === undefined) {
      helper.helpWidth =
        contextOptions && contextOptions.error
          ? this._outputConfiguration.getErrHelpWidth()
          : this._outputConfiguration.getOutHelpWidth();
    }
    return helper.formatHelp(this, helper);
  }

  /**
   * @private
   */

  _getHelpContext(contextOptions) {
    contextOptions = contextOptions || {};
    const context = { error: !!contextOptions.error };
    let write;
    if (context.error) {
      write = (arg) => this._outputConfiguration.writeErr(arg);
    } else {
      write = (arg) => this._outputConfiguration.writeOut(arg);
    }
    context.write = contextOptions.write || write;
    context.command = this;
    return context;
  }

  /**
   * Output help information for this command.
   *
   * Outputs built-in help, and custom text added using `.addHelpText()`.
   *
   * @param {{ error: boolean } | Function} [contextOptions] - pass {error:true} to write to stderr instead of stdout
   */

  outputHelp(contextOptions) {
    let deprecatedCallback;
    if (typeof contextOptions === 'function') {
      deprecatedCallback = contextOptions;
      contextOptions = undefined;
    }
    const context = this._getHelpContext(contextOptions);

    this._getCommandAndAncestors()
      .reverse()
      .forEach((command) => command.emit('beforeAllHelp', context));
    this.emit('beforeHelp', context);

    let helpInformation = this.helpInformation(context);
    if (deprecatedCallback) {
      helpInformation = deprecatedCallback(helpInformation);
      if (
        typeof helpInformation !== 'string' &&
        !Buffer.isBuffer(helpInformation)
      ) {
        throw new Error('outputHelp callback must return a string or a Buffer');
      }
    }
    context.write(helpInformation);

    if (this._getHelpOption()?.long) {
      this.emit(this._getHelpOption().long); // deprecated
    }
    this.emit('afterHelp', context);
    this._getCommandAndAncestors().forEach((command) =>
      command.emit('afterAllHelp', context),
    );
  }

  /**
   * You can pass in flags and a description to customise the built-in help option.
   * Pass in false to disable the built-in help option.
   *
   * @example
   * program.helpOption('-?, --help' 'show help'); // customise
   * program.helpOption(false); // disable
   *
   * @param {(string | boolean)} flags
   * @param {string} [description]
   * @return {Command} `this` command for chaining
   */

  helpOption(flags, description) {
    // Support disabling built-in help option.
    if (typeof flags === 'boolean') {
      if (flags) {
        this._helpOption = this._helpOption ?? undefined; // preserve existing option
      } else {
        this._helpOption = null; // disable
      }
      return this;
    }

    // Customise flags and description.
    flags = flags ?? '-h, --help';
    description = description ?? 'display help for command';
    this._helpOption = this.createOption(flags, description);

    return this;
  }

  /**
   * Lazy create help option.
   * Returns null if has been disabled with .helpOption(false).
   *
   * @returns {(Option | null)} the help option
   * @package
   */
  _getHelpOption() {
    // Lazy create help option on demand.
    if (this._helpOption === undefined) {
      this.helpOption(undefined, undefined);
    }
    return this._helpOption;
  }

  /**
   * Supply your own option to use for the built-in help option.
   * This is an alternative to using helpOption() to customise the flags and description etc.
   *
   * @param {Option} option
   * @return {Command} `this` command for chaining
   */
  addHelpOption(option) {
    this._helpOption = option;
    return this;
  }

  /**
   * Output help information and exit.
   *
   * Outputs built-in help, and custom text added using `.addHelpText()`.
   *
   * @param {{ error: boolean }} [contextOptions] - pass {error:true} to write to stderr instead of stdout
   */

  help(contextOptions) {
    this.outputHelp(contextOptions);
    let exitCode = process.exitCode || 0;
    if (
      exitCode === 0 &&
      contextOptions &&
      typeof contextOptions !== 'function' &&
      contextOptions.error
    ) {
      exitCode = 1;
    }
    // message: do not have all displayed text available so only passing placeholder.
    this._exit(exitCode, 'commander.help', '(outputHelp)');
  }

  /**
   * Add additional text to be displayed with the built-in help.
   *
   * Position is 'before' or 'after' to affect just this command,
   * and 'beforeAll' or 'afterAll' to affect this command and all its subcommands.
   *
   * @param {string} position - before or after built-in help
   * @param {(string | Function)} text - string to add, or a function returning a string
   * @return {Command} `this` command for chaining
   */
  addHelpText(position, text) {
    const allowedValues = ['beforeAll', 'before', 'after', 'afterAll'];
    if (!allowedValues.includes(position)) {
      throw new Error(`Unexpected value for position to addHelpText.
Expecting one of '${allowedValues.join("', '")}'`);
    }
    const helpEvent = `${position}Help`;
    this.on(helpEvent, (context) => {
      let helpStr;
      if (typeof text === 'function') {
        helpStr = text({ error: context.error, command: context.command });
      } else {
        helpStr = text;
      }
      // Ignore falsy value when nothing to output.
      if (helpStr) {
        context.write(`${helpStr}\n`);
      }
    });
    return this;
  }

  /**
   * Output help information if help flags specified
   *
   * @param {Array} args - array of options to search for help flags
   * @private
   */

  _outputHelpIfRequested(args) {
    const helpOption = this._getHelpOption();
    const helpRequested = helpOption && args.find((arg) => helpOption.is(arg));
    if (helpRequested) {
      this.outputHelp();
      // (Do not have all displayed text available so only passing placeholder.)
      this._exit(0, 'commander.helpDisplayed', '(outputHelp)');
    }
  }
}

/**
 * Scan arguments and increment port number for inspect calls (to avoid conflicts when spawning new command).
 *
 * @param {string[]} args - array of arguments from node.execArgv
 * @returns {string[]}
 * @private
 */

function incrementNodeInspectorPort(args) {
  // Testing for these options:
  //  --inspect[=[host:]port]
  //  --inspect-brk[=[host:]port]
  //  --inspect-port=[host:]port
  return args.map((arg) => {
    if (!arg.startsWith('--inspect')) {
      return arg;
    }
    let debugOption;
    let debugHost = '127.0.0.1';
    let debugPort = '9229';
    let match;
    if ((match = arg.match(/^(--inspect(-brk)?)$/)) !== null) {
      // e.g. --inspect
      debugOption = match[1];
    } else if (
      (match = arg.match(/^(--inspect(-brk|-port)?)=([^:]+)$/)) !== null
    ) {
      debugOption = match[1];
      if (/^\d+$/.test(match[3])) {
        // e.g. --inspect=1234
        debugPort = match[3];
      } else {
        // e.g. --inspect=localhost
        debugHost = match[3];
      }
    } else if (
      (match = arg.match(/^(--inspect(-brk|-port)?)=([^:]+):(\d+)$/)) !== null
    ) {
      // e.g. --inspect=localhost:1234
      debugOption = match[1];
      debugHost = match[3];
      debugPort = match[4];
    }

    if (debugOption && debugPort !== '0') {
      return `${debugOption}=${debugHost}:${parseInt(debugPort) + 1}`;
    }
    return arg;
  });
}

exports.Command = Command;


/***/ }),

/***/ "./node_modules/commander/lib/error.js":
/*!*********************************************!*\
  !*** ./node_modules/commander/lib/error.js ***!
  \*********************************************/
/***/ ((__unused_webpack_module, exports) => {

/**
 * CommanderError class
 */
class CommanderError extends Error {
  /**
   * Constructs the CommanderError class
   * @param {number} exitCode suggested exit code which could be used with process.exit
   * @param {string} code an id string representing the error
   * @param {string} message human-readable description of the error
   */
  constructor(exitCode, code, message) {
    super(message);
    // properly capture stack trace in Node.js
    Error.captureStackTrace(this, this.constructor);
    this.name = this.constructor.name;
    this.code = code;
    this.exitCode = exitCode;
    this.nestedError = undefined;
  }
}

/**
 * InvalidArgumentError class
 */
class InvalidArgumentError extends CommanderError {
  /**
   * Constructs the InvalidArgumentError class
   * @param {string} [message] explanation of why argument is invalid
   */
  constructor(message) {
    super(1, 'commander.invalidArgument', message);
    // properly capture stack trace in Node.js
    Error.captureStackTrace(this, this.constructor);
    this.name = this.constructor.name;
  }
}

exports.CommanderError = CommanderError;
exports.InvalidArgumentError = InvalidArgumentError;


/***/ }),

/***/ "./node_modules/commander/lib/help.js":
/*!********************************************!*\
  !*** ./node_modules/commander/lib/help.js ***!
  \********************************************/
/***/ ((__unused_webpack_module, exports, __webpack_require__) => {

const { humanReadableArgName } = __webpack_require__(/*! ./argument.js */ "./node_modules/commander/lib/argument.js");

/**
 * TypeScript import types for JSDoc, used by Visual Studio Code IntelliSense and `npm run typescript-checkJS`
 * https://www.typescriptlang.org/docs/handbook/jsdoc-supported-types.html#import-types
 * @typedef { import("./argument.js").Argument } Argument
 * @typedef { import("./command.js").Command } Command
 * @typedef { import("./option.js").Option } Option
 */

// Although this is a class, methods are static in style to allow override using subclass or just functions.
class Help {
  constructor() {
    this.helpWidth = undefined;
    this.sortSubcommands = false;
    this.sortOptions = false;
    this.showGlobalOptions = false;
  }

  /**
   * Get an array of the visible subcommands. Includes a placeholder for the implicit help command, if there is one.
   *
   * @param {Command} cmd
   * @returns {Command[]}
   */

  visibleCommands(cmd) {
    const visibleCommands = cmd.commands.filter((cmd) => !cmd._hidden);
    const helpCommand = cmd._getHelpCommand();
    if (helpCommand && !helpCommand._hidden) {
      visibleCommands.push(helpCommand);
    }
    if (this.sortSubcommands) {
      visibleCommands.sort((a, b) => {
        // @ts-ignore: because overloaded return type
        return a.name().localeCompare(b.name());
      });
    }
    return visibleCommands;
  }

  /**
   * Compare options for sort.
   *
   * @param {Option} a
   * @param {Option} b
   * @returns {number}
   */
  compareOptions(a, b) {
    const getSortKey = (option) => {
      // WYSIWYG for order displayed in help. Short used for comparison if present. No special handling for negated.
      return option.short
        ? option.short.replace(/^-/, '')
        : option.long.replace(/^--/, '');
    };
    return getSortKey(a).localeCompare(getSortKey(b));
  }

  /**
   * Get an array of the visible options. Includes a placeholder for the implicit help option, if there is one.
   *
   * @param {Command} cmd
   * @returns {Option[]}
   */

  visibleOptions(cmd) {
    const visibleOptions = cmd.options.filter((option) => !option.hidden);
    // Built-in help option.
    const helpOption = cmd._getHelpOption();
    if (helpOption && !helpOption.hidden) {
      // Automatically hide conflicting flags. Bit dubious but a historical behaviour that is convenient for single-command programs.
      const removeShort = helpOption.short && cmd._findOption(helpOption.short);
      const removeLong = helpOption.long && cmd._findOption(helpOption.long);
      if (!removeShort && !removeLong) {
        visibleOptions.push(helpOption); // no changes needed
      } else if (helpOption.long && !removeLong) {
        visibleOptions.push(
          cmd.createOption(helpOption.long, helpOption.description),
        );
      } else if (helpOption.short && !removeShort) {
        visibleOptions.push(
          cmd.createOption(helpOption.short, helpOption.description),
        );
      }
    }
    if (this.sortOptions) {
      visibleOptions.sort(this.compareOptions);
    }
    return visibleOptions;
  }

  /**
   * Get an array of the visible global options. (Not including help.)
   *
   * @param {Command} cmd
   * @returns {Option[]}
   */

  visibleGlobalOptions(cmd) {
    if (!this.showGlobalOptions) return [];

    const globalOptions = [];
    for (
      let ancestorCmd = cmd.parent;
      ancestorCmd;
      ancestorCmd = ancestorCmd.parent
    ) {
      const visibleOptions = ancestorCmd.options.filter(
        (option) => !option.hidden,
      );
      globalOptions.push(...visibleOptions);
    }
    if (this.sortOptions) {
      globalOptions.sort(this.compareOptions);
    }
    return globalOptions;
  }

  /**
   * Get an array of the arguments if any have a description.
   *
   * @param {Command} cmd
   * @returns {Argument[]}
   */

  visibleArguments(cmd) {
    // Side effect! Apply the legacy descriptions before the arguments are displayed.
    if (cmd._argsDescription) {
      cmd.registeredArguments.forEach((argument) => {
        argument.description =
          argument.description || cmd._argsDescription[argument.name()] || '';
      });
    }

    // If there are any arguments with a description then return all the arguments.
    if (cmd.registeredArguments.find((argument) => argument.description)) {
      return cmd.registeredArguments;
    }
    return [];
  }

  /**
   * Get the command term to show in the list of subcommands.
   *
   * @param {Command} cmd
   * @returns {string}
   */

  subcommandTerm(cmd) {
    // Legacy. Ignores custom usage string, and nested commands.
    const args = cmd.registeredArguments
      .map((arg) => humanReadableArgName(arg))
      .join(' ');
    return (
      cmd._name +
      (cmd._aliases[0] ? '|' + cmd._aliases[0] : '') +
      (cmd.options.length ? ' [options]' : '') + // simplistic check for non-help option
      (args ? ' ' + args : '')
    );
  }

  /**
   * Get the option term to show in the list of options.
   *
   * @param {Option} option
   * @returns {string}
   */

  optionTerm(option) {
    return option.flags;
  }

  /**
   * Get the argument term to show in the list of arguments.
   *
   * @param {Argument} argument
   * @returns {string}
   */

  argumentTerm(argument) {
    return argument.name();
  }

  /**
   * Get the longest command term length.
   *
   * @param {Command} cmd
   * @param {Help} helper
   * @returns {number}
   */

  longestSubcommandTermLength(cmd, helper) {
    return helper.visibleCommands(cmd).reduce((max, command) => {
      return Math.max(max, helper.subcommandTerm(command).length);
    }, 0);
  }

  /**
   * Get the longest option term length.
   *
   * @param {Command} cmd
   * @param {Help} helper
   * @returns {number}
   */

  longestOptionTermLength(cmd, helper) {
    return helper.visibleOptions(cmd).reduce((max, option) => {
      return Math.max(max, helper.optionTerm(option).length);
    }, 0);
  }

  /**
   * Get the longest global option term length.
   *
   * @param {Command} cmd
   * @param {Help} helper
   * @returns {number}
   */

  longestGlobalOptionTermLength(cmd, helper) {
    return helper.visibleGlobalOptions(cmd).reduce((max, option) => {
      return Math.max(max, helper.optionTerm(option).length);
    }, 0);
  }

  /**
   * Get the longest argument term length.
   *
   * @param {Command} cmd
   * @param {Help} helper
   * @returns {number}
   */

  longestArgumentTermLength(cmd, helper) {
    return helper.visibleArguments(cmd).reduce((max, argument) => {
      return Math.max(max, helper.argumentTerm(argument).length);
    }, 0);
  }

  /**
   * Get the command usage to be displayed at the top of the built-in help.
   *
   * @param {Command} cmd
   * @returns {string}
   */

  commandUsage(cmd) {
    // Usage
    let cmdName = cmd._name;
    if (cmd._aliases[0]) {
      cmdName = cmdName + '|' + cmd._aliases[0];
    }
    let ancestorCmdNames = '';
    for (
      let ancestorCmd = cmd.parent;
      ancestorCmd;
      ancestorCmd = ancestorCmd.parent
    ) {
      ancestorCmdNames = ancestorCmd.name() + ' ' + ancestorCmdNames;
    }
    return ancestorCmdNames + cmdName + ' ' + cmd.usage();
  }

  /**
   * Get the description for the command.
   *
   * @param {Command} cmd
   * @returns {string}
   */

  commandDescription(cmd) {
    // @ts-ignore: because overloaded return type
    return cmd.description();
  }

  /**
   * Get the subcommand summary to show in the list of subcommands.
   * (Fallback to description for backwards compatibility.)
   *
   * @param {Command} cmd
   * @returns {string}
   */

  subcommandDescription(cmd) {
    // @ts-ignore: because overloaded return type
    return cmd.summary() || cmd.description();
  }

  /**
   * Get the option description to show in the list of options.
   *
   * @param {Option} option
   * @return {string}
   */

  optionDescription(option) {
    const extraInfo = [];

    if (option.argChoices) {
      extraInfo.push(
        // use stringify to match the display of the default value
        `choices: ${option.argChoices.map((choice) => JSON.stringify(choice)).join(', ')}`,
      );
    }
    if (option.defaultValue !== undefined) {
      // default for boolean and negated more for programmer than end user,
      // but show true/false for boolean option as may be for hand-rolled env or config processing.
      const showDefault =
        option.required ||
        option.optional ||
        (option.isBoolean() && typeof option.defaultValue === 'boolean');
      if (showDefault) {
        extraInfo.push(
          `default: ${option.defaultValueDescription || JSON.stringify(option.defaultValue)}`,
        );
      }
    }
    // preset for boolean and negated are more for programmer than end user
    if (option.presetArg !== undefined && option.optional) {
      extraInfo.push(`preset: ${JSON.stringify(option.presetArg)}`);
    }
    if (option.envVar !== undefined) {
      extraInfo.push(`env: ${option.envVar}`);
    }
    if (extraInfo.length > 0) {
      return `${option.description} (${extraInfo.join(', ')})`;
    }

    return option.description;
  }

  /**
   * Get the argument description to show in the list of arguments.
   *
   * @param {Argument} argument
   * @return {string}
   */

  argumentDescription(argument) {
    const extraInfo = [];
    if (argument.argChoices) {
      extraInfo.push(
        // use stringify to match the display of the default value
        `choices: ${argument.argChoices.map((choice) => JSON.stringify(choice)).join(', ')}`,
      );
    }
    if (argument.defaultValue !== undefined) {
      extraInfo.push(
        `default: ${argument.defaultValueDescription || JSON.stringify(argument.defaultValue)}`,
      );
    }
    if (extraInfo.length > 0) {
      const extraDescripton = `(${extraInfo.join(', ')})`;
      if (argument.description) {
        return `${argument.description} ${extraDescripton}`;
      }
      return extraDescripton;
    }
    return argument.description;
  }

  /**
   * Generate the built-in help text.
   *
   * @param {Command} cmd
   * @param {Help} helper
   * @returns {string}
   */

  formatHelp(cmd, helper) {
    const termWidth = helper.padWidth(cmd, helper);
    const helpWidth = helper.helpWidth || 80;
    const itemIndentWidth = 2;
    const itemSeparatorWidth = 2; // between term and description
    function formatItem(term, description) {
      if (description) {
        const fullText = `${term.padEnd(termWidth + itemSeparatorWidth)}${description}`;
        return helper.wrap(
          fullText,
          helpWidth - itemIndentWidth,
          termWidth + itemSeparatorWidth,
        );
      }
      return term;
    }
    function formatList(textArray) {
      return textArray.join('\n').replace(/^/gm, ' '.repeat(itemIndentWidth));
    }

    // Usage
    let output = [`Usage: ${helper.commandUsage(cmd)}`, ''];

    // Description
    const commandDescription = helper.commandDescription(cmd);
    if (commandDescription.length > 0) {
      output = output.concat([
        helper.wrap(commandDescription, helpWidth, 0),
        '',
      ]);
    }

    // Arguments
    const argumentList = helper.visibleArguments(cmd).map((argument) => {
      return formatItem(
        helper.argumentTerm(argument),
        helper.argumentDescription(argument),
      );
    });
    if (argumentList.length > 0) {
      output = output.concat(['Arguments:', formatList(argumentList), '']);
    }

    // Options
    const optionList = helper.visibleOptions(cmd).map((option) => {
      return formatItem(
        helper.optionTerm(option),
        helper.optionDescription(option),
      );
    });
    if (optionList.length > 0) {
      output = output.concat(['Options:', formatList(optionList), '']);
    }

    if (this.showGlobalOptions) {
      const globalOptionList = helper
        .visibleGlobalOptions(cmd)
        .map((option) => {
          return formatItem(
            helper.optionTerm(option),
            helper.optionDescription(option),
          );
        });
      if (globalOptionList.length > 0) {
        output = output.concat([
          'Global Options:',
          formatList(globalOptionList),
          '',
        ]);
      }
    }

    // Commands
    const commandList = helper.visibleCommands(cmd).map((cmd) => {
      return formatItem(
        helper.subcommandTerm(cmd),
        helper.subcommandDescription(cmd),
      );
    });
    if (commandList.length > 0) {
      output = output.concat(['Commands:', formatList(commandList), '']);
    }

    return output.join('\n');
  }

  /**
   * Calculate the pad width from the maximum term length.
   *
   * @param {Command} cmd
   * @param {Help} helper
   * @returns {number}
   */

  padWidth(cmd, helper) {
    return Math.max(
      helper.longestOptionTermLength(cmd, helper),
      helper.longestGlobalOptionTermLength(cmd, helper),
      helper.longestSubcommandTermLength(cmd, helper),
      helper.longestArgumentTermLength(cmd, helper),
    );
  }

  /**
   * Wrap the given string to width characters per line, with lines after the first indented.
   * Do not wrap if insufficient room for wrapping (minColumnWidth), or string is manually formatted.
   *
   * @param {string} str
   * @param {number} width
   * @param {number} indent
   * @param {number} [minColumnWidth=40]
   * @return {string}
   *
   */

  wrap(str, width, indent, minColumnWidth = 40) {
    // Full \s characters, minus the linefeeds.
    const indents =
      ' \\f\\t\\v\u00a0\u1680\u2000-\u200a\u202f\u205f\u3000\ufeff';
    // Detect manually wrapped and indented strings by searching for line break followed by spaces.
    const manualIndent = new RegExp(`[\\n][${indents}]+`);
    if (str.match(manualIndent)) return str;
    // Do not wrap if not enough room for a wrapped column of text (as could end up with a word per line).
    const columnWidth = width - indent;
    if (columnWidth < minColumnWidth) return str;

    const leadingStr = str.slice(0, indent);
    const columnText = str.slice(indent).replace('\r\n', '\n');
    const indentString = ' '.repeat(indent);
    const zeroWidthSpace = '\u200B';
    const breaks = `\\s${zeroWidthSpace}`;
    // Match line end (so empty lines don't collapse),
    // or as much text as will fit in column, or excess text up to first break.
    const regex = new RegExp(
      `\n|.{1,${columnWidth - 1}}([${breaks}]|$)|[^${breaks}]+?([${breaks}]|$)`,
      'g',
    );
    const lines = columnText.match(regex) || [];
    return (
      leadingStr +
      lines
        .map((line, i) => {
          if (line === '\n') return ''; // preserve empty lines
          return (i > 0 ? indentString : '') + line.trimEnd();
        })
        .join('\n')
    );
  }
}

exports.Help = Help;


/***/ }),

/***/ "./node_modules/commander/lib/option.js":
/*!**********************************************!*\
  !*** ./node_modules/commander/lib/option.js ***!
  \**********************************************/
/***/ ((__unused_webpack_module, exports, __webpack_require__) => {

const { InvalidArgumentError } = __webpack_require__(/*! ./error.js */ "./node_modules/commander/lib/error.js");

class Option {
  /**
   * Initialize a new `Option` with the given `flags` and `description`.
   *
   * @param {string} flags
   * @param {string} [description]
   */

  constructor(flags, description) {
    this.flags = flags;
    this.description = description || '';

    this.required = flags.includes('<'); // A value must be supplied when the option is specified.
    this.optional = flags.includes('['); // A value is optional when the option is specified.
    // variadic test ignores <value,...> et al which might be used to describe custom splitting of single argument
    this.variadic = /\w\.\.\.[>\]]$/.test(flags); // The option can take multiple values.
    this.mandatory = false; // The option must have a value after parsing, which usually means it must be specified on command line.
    const optionFlags = splitOptionFlags(flags);
    this.short = optionFlags.shortFlag;
    this.long = optionFlags.longFlag;
    this.negate = false;
    if (this.long) {
      this.negate = this.long.startsWith('--no-');
    }
    this.defaultValue = undefined;
    this.defaultValueDescription = undefined;
    this.presetArg = undefined;
    this.envVar = undefined;
    this.parseArg = undefined;
    this.hidden = false;
    this.argChoices = undefined;
    this.conflictsWith = [];
    this.implied = undefined;
  }

  /**
   * Set the default value, and optionally supply the description to be displayed in the help.
   *
   * @param {*} value
   * @param {string} [description]
   * @return {Option}
   */

  default(value, description) {
    this.defaultValue = value;
    this.defaultValueDescription = description;
    return this;
  }

  /**
   * Preset to use when option used without option-argument, especially optional but also boolean and negated.
   * The custom processing (parseArg) is called.
   *
   * @example
   * new Option('--color').default('GREYSCALE').preset('RGB');
   * new Option('--donate [amount]').preset('20').argParser(parseFloat);
   *
   * @param {*} arg
   * @return {Option}
   */

  preset(arg) {
    this.presetArg = arg;
    return this;
  }

  /**
   * Add option name(s) that conflict with this option.
   * An error will be displayed if conflicting options are found during parsing.
   *
   * @example
   * new Option('--rgb').conflicts('cmyk');
   * new Option('--js').conflicts(['ts', 'jsx']);
   *
   * @param {(string | string[])} names
   * @return {Option}
   */

  conflicts(names) {
    this.conflictsWith = this.conflictsWith.concat(names);
    return this;
  }

  /**
   * Specify implied option values for when this option is set and the implied options are not.
   *
   * The custom processing (parseArg) is not called on the implied values.
   *
   * @example
   * program
   *   .addOption(new Option('--log', 'write logging information to file'))
   *   .addOption(new Option('--trace', 'log extra details').implies({ log: 'trace.txt' }));
   *
   * @param {object} impliedOptionValues
   * @return {Option}
   */
  implies(impliedOptionValues) {
    let newImplied = impliedOptionValues;
    if (typeof impliedOptionValues === 'string') {
      // string is not documented, but easy mistake and we can do what user probably intended.
      newImplied = { [impliedOptionValues]: true };
    }
    this.implied = Object.assign(this.implied || {}, newImplied);
    return this;
  }

  /**
   * Set environment variable to check for option value.
   *
   * An environment variable is only used if when processed the current option value is
   * undefined, or the source of the current value is 'default' or 'config' or 'env'.
   *
   * @param {string} name
   * @return {Option}
   */

  env(name) {
    this.envVar = name;
    return this;
  }

  /**
   * Set the custom handler for processing CLI option arguments into option values.
   *
   * @param {Function} [fn]
   * @return {Option}
   */

  argParser(fn) {
    this.parseArg = fn;
    return this;
  }

  /**
   * Whether the option is mandatory and must have a value after parsing.
   *
   * @param {boolean} [mandatory=true]
   * @return {Option}
   */

  makeOptionMandatory(mandatory = true) {
    this.mandatory = !!mandatory;
    return this;
  }

  /**
   * Hide option in help.
   *
   * @param {boolean} [hide=true]
   * @return {Option}
   */

  hideHelp(hide = true) {
    this.hidden = !!hide;
    return this;
  }

  /**
   * @package
   */

  _concatValue(value, previous) {
    if (previous === this.defaultValue || !Array.isArray(previous)) {
      return [value];
    }

    return previous.concat(value);
  }

  /**
   * Only allow option value to be one of choices.
   *
   * @param {string[]} values
   * @return {Option}
   */

  choices(values) {
    this.argChoices = values.slice();
    this.parseArg = (arg, previous) => {
      if (!this.argChoices.includes(arg)) {
        throw new InvalidArgumentError(
          `Allowed choices are ${this.argChoices.join(', ')}.`,
        );
      }
      if (this.variadic) {
        return this._concatValue(arg, previous);
      }
      return arg;
    };
    return this;
  }

  /**
   * Return option name.
   *
   * @return {string}
   */

  name() {
    if (this.long) {
      return this.long.replace(/^--/, '');
    }
    return this.short.replace(/^-/, '');
  }

  /**
   * Return option name, in a camelcase format that can be used
   * as a object attribute key.
   *
   * @return {string}
   */

  attributeName() {
    return camelcase(this.name().replace(/^no-/, ''));
  }

  /**
   * Check if `arg` matches the short or long flag.
   *
   * @param {string} arg
   * @return {boolean}
   * @package
   */

  is(arg) {
    return this.short === arg || this.long === arg;
  }

  /**
   * Return whether a boolean option.
   *
   * Options are one of boolean, negated, required argument, or optional argument.
   *
   * @return {boolean}
   * @package
   */

  isBoolean() {
    return !this.required && !this.optional && !this.negate;
  }
}

/**
 * This class is to make it easier to work with dual options, without changing the existing
 * implementation. We support separate dual options for separate positive and negative options,
 * like `--build` and `--no-build`, which share a single option value. This works nicely for some
 * use cases, but is tricky for others where we want separate behaviours despite
 * the single shared option value.
 */
class DualOptions {
  /**
   * @param {Option[]} options
   */
  constructor(options) {
    this.positiveOptions = new Map();
    this.negativeOptions = new Map();
    this.dualOptions = new Set();
    options.forEach((option) => {
      if (option.negate) {
        this.negativeOptions.set(option.attributeName(), option);
      } else {
        this.positiveOptions.set(option.attributeName(), option);
      }
    });
    this.negativeOptions.forEach((value, key) => {
      if (this.positiveOptions.has(key)) {
        this.dualOptions.add(key);
      }
    });
  }

  /**
   * Did the value come from the option, and not from possible matching dual option?
   *
   * @param {*} value
   * @param {Option} option
   * @returns {boolean}
   */
  valueFromOption(value, option) {
    const optionKey = option.attributeName();
    if (!this.dualOptions.has(optionKey)) return true;

    // Use the value to deduce if (probably) came from the option.
    const preset = this.negativeOptions.get(optionKey).presetArg;
    const negativeValue = preset !== undefined ? preset : false;
    return option.negate === (negativeValue === value);
  }
}

/**
 * Convert string from kebab-case to camelCase.
 *
 * @param {string} str
 * @return {string}
 * @private
 */

function camelcase(str) {
  return str.split('-').reduce((str, word) => {
    return str + word[0].toUpperCase() + word.slice(1);
  });
}

/**
 * Split the short and long flag out of something like '-m,--mixed <value>'
 *
 * @private
 */

function splitOptionFlags(flags) {
  let shortFlag;
  let longFlag;
  // Use original very loose parsing to maintain backwards compatibility for now,
  // which allowed for example unintended `-sw, --short-word` [sic].
  const flagParts = flags.split(/[ |,]+/);
  if (flagParts.length > 1 && !/^[[<]/.test(flagParts[1]))
    shortFlag = flagParts.shift();
  longFlag = flagParts.shift();
  // Add support for lone short flag without significantly changing parsing!
  if (!shortFlag && /^-[^-]$/.test(longFlag)) {
    shortFlag = longFlag;
    longFlag = undefined;
  }
  return { shortFlag, longFlag };
}

exports.Option = Option;
exports.DualOptions = DualOptions;


/***/ }),

/***/ "./node_modules/commander/lib/suggestSimilar.js":
/*!******************************************************!*\
  !*** ./node_modules/commander/lib/suggestSimilar.js ***!
  \******************************************************/
/***/ ((__unused_webpack_module, exports) => {

const maxDistance = 3;

function editDistance(a, b) {
  // https://en.wikipedia.org/wiki/Damerau–Levenshtein_distance
  // Calculating optimal string alignment distance, no substring is edited more than once.
  // (Simple implementation.)

  // Quick early exit, return worst case.
  if (Math.abs(a.length - b.length) > maxDistance)
    return Math.max(a.length, b.length);

  // distance between prefix substrings of a and b
  const d = [];

  // pure deletions turn a into empty string
  for (let i = 0; i <= a.length; i++) {
    d[i] = [i];
  }
  // pure insertions turn empty string into b
  for (let j = 0; j <= b.length; j++) {
    d[0][j] = j;
  }

  // fill matrix
  for (let j = 1; j <= b.length; j++) {
    for (let i = 1; i <= a.length; i++) {
      let cost = 1;
      if (a[i - 1] === b[j - 1]) {
        cost = 0;
      } else {
        cost = 1;
      }
      d[i][j] = Math.min(
        d[i - 1][j] + 1, // deletion
        d[i][j - 1] + 1, // insertion
        d[i - 1][j - 1] + cost, // substitution
      );
      // transposition
      if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) {
        d[i][j] = Math.min(d[i][j], d[i - 2][j - 2] + 1);
      }
    }
  }

  return d[a.length][b.length];
}

/**
 * Find close matches, restricted to same number of edits.
 *
 * @param {string} word
 * @param {string[]} candidates
 * @returns {string}
 */

function suggestSimilar(word, candidates) {
  if (!candidates || candidates.length === 0) return '';
  // remove possible duplicates
  candidates = Array.from(new Set(candidates));

  const searchingOptions = word.startsWith('--');
  if (searchingOptions) {
    word = word.slice(2);
    candidates = candidates.map((candidate) => candidate.slice(2));
  }

  let similar = [];
  let bestDistance = maxDistance;
  const minSimilarity = 0.4;
  candidates.forEach((candidate) => {
    if (candidate.length <= 1) return; // no one character guesses

    const distance = editDistance(word, candidate);
    const length = Math.max(word.length, candidate.length);
    const similarity = (length - distance) / length;
    if (similarity > minSimilarity) {
      if (distance < bestDistance) {
        // better edit distance, throw away previous worse matches
        bestDistance = distance;
        similar = [candidate];
      } else if (distance === bestDistance) {
        similar.push(candidate);
      }
    }
  });

  similar.sort((a, b) => a.localeCompare(b));
  if (searchingOptions) {
    similar = similar.map((candidate) => `--${candidate}`);
  }

  if (similar.length > 1) {
    return `\n(Did you mean one of ${similar.join(', ')}?)`;
  }
  if (similar.length === 1) {
    return `\n(Did you mean ${similar[0]}?)`;
  }
  return '';
}

exports.suggestSimilar = suggestSimilar;


/***/ }),

/***/ "./node_modules/chalk/source/index.js":
/*!********************************************!*\
  !*** ./node_modules/chalk/source/index.js ***!
  \********************************************/
/***/ ((__unused_webpack___webpack_module__, __webpack_exports__, __webpack_require__) => {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   Chalk: () => (/* binding */ Chalk),
/* harmony export */   backgroundColorNames: () => (/* reexport safe */ _ansi_styles__WEBPACK_IMPORTED_MODULE_1__.backgroundColorNames),
/* harmony export */   backgroundColors: () => (/* reexport safe */ _ansi_styles__WEBPACK_IMPORTED_MODULE_1__.backgroundColorNames),
/* harmony export */   chalkStderr: () => (/* binding */ chalkStderr),
/* harmony export */   colorNames: () => (/* reexport safe */ _ansi_styles__WEBPACK_IMPORTED_MODULE_1__.colorNames),
/* harmony export */   colors: () => (/* reexport safe */ _ansi_styles__WEBPACK_IMPORTED_MODULE_1__.colorNames),
/* harmony export */   "default": () => (__WEBPACK_DEFAULT_EXPORT__),
/* harmony export */   foregroundColorNames: () => (/* reexport safe */ _ansi_styles__WEBPACK_IMPORTED_MODULE_1__.foregroundColorNames),
/* harmony export */   foregroundColors: () => (/* reexport safe */ _ansi_styles__WEBPACK_IMPORTED_MODULE_1__.foregroundColorNames),
/* harmony export */   modifierNames: () => (/* reexport safe */ _ansi_styles__WEBPACK_IMPORTED_MODULE_1__.modifierNames),
/* harmony export */   modifiers: () => (/* reexport safe */ _ansi_styles__WEBPACK_IMPORTED_MODULE_1__.modifierNames),
/* harmony export */   supportsColor: () => (/* binding */ stdoutColor),
/* harmony export */   supportsColorStderr: () => (/* binding */ stderrColor)
/* harmony export */ });
/* harmony import */ var _ansi_styles__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! ./vendor/ansi-styles/index.js */ "./node_modules/chalk/source/vendor/ansi-styles/index.js");
/* harmony import */ var _supports_color__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! #supports-color */ "./node_modules/chalk/source/vendor/supports-color/index.js");
/* harmony import */ var _utilities_js__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(/*! ./utilities.js */ "./node_modules/chalk/source/utilities.js");




const {stdout: stdoutColor, stderr: stderrColor} = _supports_color__WEBPACK_IMPORTED_MODULE_0__["default"];

const GENERATOR = Symbol('GENERATOR');
const STYLER = Symbol('STYLER');
const IS_EMPTY = Symbol('IS_EMPTY');

// `supportsColor.level` → `ansiStyles.color[name]` mapping
const levelMapping = [
	'ansi',
	'ansi',
	'ansi256',
	'ansi16m',
];

const styles = Object.create(null);

const applyOptions = (object, options = {}) => {
	if (options.level && !(Number.isInteger(options.level) && options.level >= 0 && options.level <= 3)) {
		throw new Error('The `level` option should be an integer from 0 to 3');
	}

	// Detect level if not set manually
	const colorLevel = stdoutColor ? stdoutColor.level : 0;
	object.level = options.level === undefined ? colorLevel : options.level;
};

class Chalk {
	constructor(options) {
		// eslint-disable-next-line no-constructor-return
		return chalkFactory(options);
	}
}

const chalkFactory = options => {
	const chalk = (...strings) => strings.join(' ');
	applyOptions(chalk, options);

	Object.setPrototypeOf(chalk, createChalk.prototype);

	return chalk;
};

function createChalk(options) {
	return chalkFactory(options);
}

Object.setPrototypeOf(createChalk.prototype, Function.prototype);

for (const [styleName, style] of Object.entries(_ansi_styles__WEBPACK_IMPORTED_MODULE_1__["default"])) {
	styles[styleName] = {
		get() {
			const builder = createBuilder(this, createStyler(style.open, style.close, this[STYLER]), this[IS_EMPTY]);
			Object.defineProperty(this, styleName, {value: builder});
			return builder;
		},
	};
}

styles.visible = {
	get() {
		const builder = createBuilder(this, this[STYLER], true);
		Object.defineProperty(this, 'visible', {value: builder});
		return builder;
	},
};

const getModelAnsi = (model, level, type, ...arguments_) => {
	if (model === 'rgb') {
		if (level === 'ansi16m') {
			return _ansi_styles__WEBPACK_IMPORTED_MODULE_1__["default"][type].ansi16m(...arguments_);
		}

		if (level === 'ansi256') {
			return _ansi_styles__WEBPACK_IMPORTED_MODULE_1__["default"][type].ansi256(_ansi_styles__WEBPACK_IMPORTED_MODULE_1__["default"].rgbToAnsi256(...arguments_));
		}

		return _ansi_styles__WEBPACK_IMPORTED_MODULE_1__["default"][type].ansi(_ansi_styles__WEBPACK_IMPORTED_MODULE_1__["default"].rgbToAnsi(...arguments_));
	}

	if (model === 'hex') {
		return getModelAnsi('rgb', level, type, ..._ansi_styles__WEBPACK_IMPORTED_MODULE_1__["default"].hexToRgb(...arguments_));
	}

	return _ansi_styles__WEBPACK_IMPORTED_MODULE_1__["default"][type][model](...arguments_);
};

const usedModels = ['rgb', 'hex', 'ansi256'];

for (const model of usedModels) {
	styles[model] = {
		get() {
			const {level} = this;
			return function (...arguments_) {
				const styler = createStyler(getModelAnsi(model, levelMapping[level], 'color', ...arguments_), _ansi_styles__WEBPACK_IMPORTED_MODULE_1__["default"].color.close, this[STYLER]);
				return createBuilder(this, styler, this[IS_EMPTY]);
			};
		},
	};

	const bgModel = 'bg' + model[0].toUpperCase() + model.slice(1);
	styles[bgModel] = {
		get() {
			const {level} = this;
			return function (...arguments_) {
				const styler = createStyler(getModelAnsi(model, levelMapping[level], 'bgColor', ...arguments_), _ansi_styles__WEBPACK_IMPORTED_MODULE_1__["default"].bgColor.close, this[STYLER]);
				return createBuilder(this, styler, this[IS_EMPTY]);
			};
		},
	};
}

const proto = Object.defineProperties(() => {}, {
	...styles,
	level: {
		enumerable: true,
		get() {
			return this[GENERATOR].level;
		},
		set(level) {
			this[GENERATOR].level = level;
		},
	},
});

const createStyler = (open, close, parent) => {
	let openAll;
	let closeAll;
	if (parent === undefined) {
		openAll = open;
		closeAll = close;
	} else {
		openAll = parent.openAll + open;
		closeAll = close + parent.closeAll;
	}

	return {
		open,
		close,
		openAll,
		closeAll,
		parent,
	};
};

const createBuilder = (self, _styler, _isEmpty) => {
	// Single argument is hot path, implicit coercion is faster than anything
	// eslint-disable-next-line no-implicit-coercion
	const builder = (...arguments_) => applyStyle(builder, (arguments_.length === 1) ? ('' + arguments_[0]) : arguments_.join(' '));

	// We alter the prototype because we must return a function, but there is
	// no way to create a function with a different prototype
	Object.setPrototypeOf(builder, proto);

	builder[GENERATOR] = self;
	builder[STYLER] = _styler;
	builder[IS_EMPTY] = _isEmpty;

	return builder;
};

const applyStyle = (self, string) => {
	if (self.level <= 0 || !string) {
		return self[IS_EMPTY] ? '' : string;
	}

	let styler = self[STYLER];

	if (styler === undefined) {
		return string;
	}

	const {openAll, closeAll} = styler;
	if (string.includes('\u001B')) {
		while (styler !== undefined) {
			// Replace any instances already present with a re-opening code
			// otherwise only the part of the string until said closing code
			// will be colored, and the rest will simply be 'plain'.
			string = (0,_utilities_js__WEBPACK_IMPORTED_MODULE_2__.stringReplaceAll)(string, styler.close, styler.open);

			styler = styler.parent;
		}
	}

	// We can move both next actions out of loop, because remaining actions in loop won't have
	// any/visible effect on parts we add here. Close the styling before a linebreak and reopen
	// after next line to fix a bleed issue on macOS: https://github.com/chalk/chalk/pull/92
	const lfIndex = string.indexOf('\n');
	if (lfIndex !== -1) {
		string = (0,_utilities_js__WEBPACK_IMPORTED_MODULE_2__.stringEncaseCRLFWithFirstIndex)(string, closeAll, openAll, lfIndex);
	}

	return openAll + string + closeAll;
};

Object.defineProperties(createChalk.prototype, styles);

const chalk = createChalk();
const chalkStderr = createChalk({level: stderrColor ? stderrColor.level : 0});





/* harmony default export */ const __WEBPACK_DEFAULT_EXPORT__ = (chalk);


/***/ }),

/***/ "./node_modules/chalk/source/utilities.js":
/*!************************************************!*\
  !*** ./node_modules/chalk/source/utilities.js ***!
  \************************************************/
/***/ ((__unused_webpack___webpack_module__, __webpack_exports__, __webpack_require__) => {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   stringEncaseCRLFWithFirstIndex: () => (/* binding */ stringEncaseCRLFWithFirstIndex),
/* harmony export */   stringReplaceAll: () => (/* binding */ stringReplaceAll)
/* harmony export */ });
// TODO: When targeting Node.js 16, use `String.prototype.replaceAll`.
function stringReplaceAll(string, substring, replacer) {
	let index = string.indexOf(substring);
	if (index === -1) {
		return string;
	}

	const substringLength = substring.length;
	let endIndex = 0;
	let returnValue = '';
	do {
		returnValue += string.slice(endIndex, index) + substring + replacer;
		endIndex = index + substringLength;
		index = string.indexOf(substring, endIndex);
	} while (index !== -1);

	returnValue += string.slice(endIndex);
	return returnValue;
}

function stringEncaseCRLFWithFirstIndex(string, prefix, postfix, index) {
	let endIndex = 0;
	let returnValue = '';
	do {
		const gotCR = string[index - 1] === '\r';
		returnValue += string.slice(endIndex, (gotCR ? index - 1 : index)) + prefix + (gotCR ? '\r\n' : '\n') + postfix;
		endIndex = index + 1;
		index = string.indexOf('\n', endIndex);
	} while (index !== -1);

	returnValue += string.slice(endIndex);
	return returnValue;
}


/***/ }),

/***/ "./node_modules/chalk/source/vendor/ansi-styles/index.js":
/*!***************************************************************!*\
  !*** ./node_modules/chalk/source/vendor/ansi-styles/index.js ***!
  \***************************************************************/
/***/ ((__unused_webpack___webpack_module__, __webpack_exports__, __webpack_require__) => {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   backgroundColorNames: () => (/* binding */ backgroundColorNames),
/* harmony export */   colorNames: () => (/* binding */ colorNames),
/* harmony export */   "default": () => (__WEBPACK_DEFAULT_EXPORT__),
/* harmony export */   foregroundColorNames: () => (/* binding */ foregroundColorNames),
/* harmony export */   modifierNames: () => (/* binding */ modifierNames)
/* harmony export */ });
const ANSI_BACKGROUND_OFFSET = 10;

const wrapAnsi16 = (offset = 0) => code => `\u001B[${code + offset}m`;

const wrapAnsi256 = (offset = 0) => code => `\u001B[${38 + offset};5;${code}m`;

const wrapAnsi16m = (offset = 0) => (red, green, blue) => `\u001B[${38 + offset};2;${red};${green};${blue}m`;

const styles = {
	modifier: {
		reset: [0, 0],
		// 21 isn't widely supported and 22 does the same thing
		bold: [1, 22],
		dim: [2, 22],
		italic: [3, 23],
		underline: [4, 24],
		overline: [53, 55],
		inverse: [7, 27],
		hidden: [8, 28],
		strikethrough: [9, 29],
	},
	color: {
		black: [30, 39],
		red: [31, 39],
		green: [32, 39],
		yellow: [33, 39],
		blue: [34, 39],
		magenta: [35, 39],
		cyan: [36, 39],
		white: [37, 39],

		// Bright color
		blackBright: [90, 39],
		gray: [90, 39], // Alias of `blackBright`
		grey: [90, 39], // Alias of `blackBright`
		redBright: [91, 39],
		greenBright: [92, 39],
		yellowBright: [93, 39],
		blueBright: [94, 39],
		magentaBright: [95, 39],
		cyanBright: [96, 39],
		whiteBright: [97, 39],
	},
	bgColor: {
		bgBlack: [40, 49],
		bgRed: [41, 49],
		bgGreen: [42, 49],
		bgYellow: [43, 49],
		bgBlue: [44, 49],
		bgMagenta: [45, 49],
		bgCyan: [46, 49],
		bgWhite: [47, 49],

		// Bright color
		bgBlackBright: [100, 49],
		bgGray: [100, 49], // Alias of `bgBlackBright`
		bgGrey: [100, 49], // Alias of `bgBlackBright`
		bgRedBright: [101, 49],
		bgGreenBright: [102, 49],
		bgYellowBright: [103, 49],
		bgBlueBright: [104, 49],
		bgMagentaBright: [105, 49],
		bgCyanBright: [106, 49],
		bgWhiteBright: [107, 49],
	},
};

const modifierNames = Object.keys(styles.modifier);
const foregroundColorNames = Object.keys(styles.color);
const backgroundColorNames = Object.keys(styles.bgColor);
const colorNames = [...foregroundColorNames, ...backgroundColorNames];

function assembleStyles() {
	const codes = new Map();

	for (const [groupName, group] of Object.entries(styles)) {
		for (const [styleName, style] of Object.entries(group)) {
			styles[styleName] = {
				open: `\u001B[${style[0]}m`,
				close: `\u001B[${style[1]}m`,
			};

			group[styleName] = styles[styleName];

			codes.set(style[0], style[1]);
		}

		Object.defineProperty(styles, groupName, {
			value: group,
			enumerable: false,
		});
	}

	Object.defineProperty(styles, 'codes', {
		value: codes,
		enumerable: false,
	});

	styles.color.close = '\u001B[39m';
	styles.bgColor.close = '\u001B[49m';

	styles.color.ansi = wrapAnsi16();
	styles.color.ansi256 = wrapAnsi256();
	styles.color.ansi16m = wrapAnsi16m();
	styles.bgColor.ansi = wrapAnsi16(ANSI_BACKGROUND_OFFSET);
	styles.bgColor.ansi256 = wrapAnsi256(ANSI_BACKGROUND_OFFSET);
	styles.bgColor.ansi16m = wrapAnsi16m(ANSI_BACKGROUND_OFFSET);

	// From https://github.com/Qix-/color-convert/blob/3f0e0d4e92e235796ccb17f6e85c72094a651f49/conversions.js
	Object.defineProperties(styles, {
		rgbToAnsi256: {
			value(red, green, blue) {
				// We use the extended greyscale palette here, with the exception of
				// black and white. normal palette only has 4 greyscale shades.
				if (red === green && green === blue) {
					if (red < 8) {
						return 16;
					}

					if (red > 248) {
						return 231;
					}

					return Math.round(((red - 8) / 247) * 24) + 232;
				}

				return 16
					+ (36 * Math.round(red / 255 * 5))
					+ (6 * Math.round(green / 255 * 5))
					+ Math.round(blue / 255 * 5);
			},
			enumerable: false,
		},
		hexToRgb: {
			value(hex) {
				const matches = /[a-f\d]{6}|[a-f\d]{3}/i.exec(hex.toString(16));
				if (!matches) {
					return [0, 0, 0];
				}

				let [colorString] = matches;

				if (colorString.length === 3) {
					colorString = [...colorString].map(character => character + character).join('');
				}

				const integer = Number.parseInt(colorString, 16);

				return [
					/* eslint-disable no-bitwise */
					(integer >> 16) & 0xFF,
					(integer >> 8) & 0xFF,
					integer & 0xFF,
					/* eslint-enable no-bitwise */
				];
			},
			enumerable: false,
		},
		hexToAnsi256: {
			value: hex => styles.rgbToAnsi256(...styles.hexToRgb(hex)),
			enumerable: false,
		},
		ansi256ToAnsi: {
			value(code) {
				if (code < 8) {
					return 30 + code;
				}

				if (code < 16) {
					return 90 + (code - 8);
				}

				let red;
				let green;
				let blue;

				if (code >= 232) {
					red = (((code - 232) * 10) + 8) / 255;
					green = red;
					blue = red;
				} else {
					code -= 16;

					const remainder = code % 36;

					red = Math.floor(code / 36) / 5;
					green = Math.floor(remainder / 6) / 5;
					blue = (remainder % 6) / 5;
				}

				const value = Math.max(red, green, blue) * 2;

				if (value === 0) {
					return 30;
				}

				// eslint-disable-next-line no-bitwise
				let result = 30 + ((Math.round(blue) << 2) | (Math.round(green) << 1) | Math.round(red));

				if (value === 2) {
					result += 60;
				}

				return result;
			},
			enumerable: false,
		},
		rgbToAnsi: {
			value: (red, green, blue) => styles.ansi256ToAnsi(styles.rgbToAnsi256(red, green, blue)),
			enumerable: false,
		},
		hexToAnsi: {
			value: hex => styles.ansi256ToAnsi(styles.hexToAnsi256(hex)),
			enumerable: false,
		},
	});

	return styles;
}

const ansiStyles = assembleStyles();

/* harmony default export */ const __WEBPACK_DEFAULT_EXPORT__ = (ansiStyles);


/***/ }),

/***/ "./node_modules/chalk/source/vendor/supports-color/index.js":
/*!******************************************************************!*\
  !*** ./node_modules/chalk/source/vendor/supports-color/index.js ***!
  \******************************************************************/
/***/ ((__unused_webpack___webpack_module__, __webpack_exports__, __webpack_require__) => {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   createSupportsColor: () => (/* binding */ createSupportsColor),
/* harmony export */   "default": () => (__WEBPACK_DEFAULT_EXPORT__)
/* harmony export */ });
/* harmony import */ var node_process__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! node:process */ "node:process");
/* harmony import */ var node_os__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! node:os */ "node:os");
/* harmony import */ var node_tty__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(/*! node:tty */ "node:tty");




// From: https://github.com/sindresorhus/has-flag/blob/main/index.js
/// function hasFlag(flag, argv = globalThis.Deno?.args ?? process.argv) {
function hasFlag(flag, argv = globalThis.Deno ? globalThis.Deno.args : node_process__WEBPACK_IMPORTED_MODULE_0__.argv) {
	const prefix = flag.startsWith('-') ? '' : (flag.length === 1 ? '-' : '--');
	const position = argv.indexOf(prefix + flag);
	const terminatorPosition = argv.indexOf('--');
	return position !== -1 && (terminatorPosition === -1 || position < terminatorPosition);
}

const {env} = node_process__WEBPACK_IMPORTED_MODULE_0__;

let flagForceColor;
if (
	hasFlag('no-color')
	|| hasFlag('no-colors')
	|| hasFlag('color=false')
	|| hasFlag('color=never')
) {
	flagForceColor = 0;
} else if (
	hasFlag('color')
	|| hasFlag('colors')
	|| hasFlag('color=true')
	|| hasFlag('color=always')
) {
	flagForceColor = 1;
}

function envForceColor() {
	if ('FORCE_COLOR' in env) {
		if (env.FORCE_COLOR === 'true') {
			return 1;
		}

		if (env.FORCE_COLOR === 'false') {
			return 0;
		}

		return env.FORCE_COLOR.length === 0 ? 1 : Math.min(Number.parseInt(env.FORCE_COLOR, 10), 3);
	}
}

function translateLevel(level) {
	if (level === 0) {
		return false;
	}

	return {
		level,
		hasBasic: true,
		has256: level >= 2,
		has16m: level >= 3,
	};
}

function _supportsColor(haveStream, {streamIsTTY, sniffFlags = true} = {}) {
	const noFlagForceColor = envForceColor();
	if (noFlagForceColor !== undefined) {
		flagForceColor = noFlagForceColor;
	}

	const forceColor = sniffFlags ? flagForceColor : noFlagForceColor;

	if (forceColor === 0) {
		return 0;
	}

	if (sniffFlags) {
		if (hasFlag('color=16m')
			|| hasFlag('color=full')
			|| hasFlag('color=truecolor')) {
			return 3;
		}

		if (hasFlag('color=256')) {
			return 2;
		}
	}

	// Check for Azure DevOps pipelines.
	// Has to be above the `!streamIsTTY` check.
	if ('TF_BUILD' in env && 'AGENT_NAME' in env) {
		return 1;
	}

	if (haveStream && !streamIsTTY && forceColor === undefined) {
		return 0;
	}

	const min = forceColor || 0;

	if (env.TERM === 'dumb') {
		return min;
	}

	if (node_process__WEBPACK_IMPORTED_MODULE_0__.platform === 'win32') {
		// Windows 10 build 10586 is the first Windows release that supports 256 colors.
		// Windows 10 build 14931 is the first release that supports 16m/TrueColor.
		const osRelease = node_os__WEBPACK_IMPORTED_MODULE_1__.release().split('.');
		if (
			Number(osRelease[0]) >= 10
			&& Number(osRelease[2]) >= 10_586
		) {
			return Number(osRelease[2]) >= 14_931 ? 3 : 2;
		}

		return 1;
	}

	if ('CI' in env) {
		if ('GITHUB_ACTIONS' in env || 'GITEA_ACTIONS' in env) {
			return 3;
		}

		if (['TRAVIS', 'CIRCLECI', 'APPVEYOR', 'GITLAB_CI', 'BUILDKITE', 'DRONE'].some(sign => sign in env) || env.CI_NAME === 'codeship') {
			return 1;
		}

		return min;
	}

	if ('TEAMCITY_VERSION' in env) {
		return /^(9\.(0*[1-9]\d*)\.|\d{2,}\.)/.test(env.TEAMCITY_VERSION) ? 1 : 0;
	}

	if (env.COLORTERM === 'truecolor') {
		return 3;
	}

	if (env.TERM === 'xterm-kitty') {
		return 3;
	}

	if ('TERM_PROGRAM' in env) {
		const version = Number.parseInt((env.TERM_PROGRAM_VERSION || '').split('.')[0], 10);

		switch (env.TERM_PROGRAM) {
			case 'iTerm.app': {
				return version >= 3 ? 3 : 2;
			}

			case 'Apple_Terminal': {
				return 2;
			}
			// No default
		}
	}

	if (/-256(color)?$/i.test(env.TERM)) {
		return 2;
	}

	if (/^screen|^xterm|^vt100|^vt220|^rxvt|color|ansi|cygwin|linux/i.test(env.TERM)) {
		return 1;
	}

	if ('COLORTERM' in env) {
		return 1;
	}

	return min;
}

function createSupportsColor(stream, options = {}) {
	const level = _supportsColor(stream, {
		streamIsTTY: stream && stream.isTTY,
		...options,
	});

	return translateLevel(level);
}

const supportsColor = {
	stdout: createSupportsColor({isTTY: node_tty__WEBPACK_IMPORTED_MODULE_2__.isatty(1)}),
	stderr: createSupportsColor({isTTY: node_tty__WEBPACK_IMPORTED_MODULE_2__.isatty(2)}),
};

/* harmony default export */ const __WEBPACK_DEFAULT_EXPORT__ = (supportsColor);


/***/ }),

/***/ "./node_modules/strip-json-comments/index.js":
/*!***************************************************!*\
  !*** ./node_modules/strip-json-comments/index.js ***!
  \***************************************************/
/***/ ((__unused_webpack___webpack_module__, __webpack_exports__, __webpack_require__) => {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "default": () => (/* binding */ stripJsonComments)
/* harmony export */ });
const singleComment = Symbol('singleComment');
const multiComment = Symbol('multiComment');

const stripWithoutWhitespace = () => '';
const stripWithWhitespace = (string, start, end) => string.slice(start, end).replace(/\S/g, ' ');

const isEscaped = (jsonString, quotePosition) => {
	let index = quotePosition - 1;
	let backslashCount = 0;

	while (jsonString[index] === '\\') {
		index -= 1;
		backslashCount += 1;
	}

	return Boolean(backslashCount % 2);
};

function stripJsonComments(jsonString, {whitespace = true, trailingCommas = false} = {}) {
	if (typeof jsonString !== 'string') {
		throw new TypeError(`Expected argument \`jsonString\` to be a \`string\`, got \`${typeof jsonString}\``);
	}

	const strip = whitespace ? stripWithWhitespace : stripWithoutWhitespace;

	let isInsideString = false;
	let isInsideComment = false;
	let offset = 0;
	let buffer = '';
	let result = '';
	let commaIndex = -1;

	for (let index = 0; index < jsonString.length; index++) {
		const currentCharacter = jsonString[index];
		const nextCharacter = jsonString[index + 1];

		if (!isInsideComment && currentCharacter === '"') {
			// Enter or exit string
			const escaped = isEscaped(jsonString, index);
			if (!escaped) {
				isInsideString = !isInsideString;
			}
		}

		if (isInsideString) {
			continue;
		}

		if (!isInsideComment && currentCharacter + nextCharacter === '//') {
			// Enter single-line comment
			buffer += jsonString.slice(offset, index);
			offset = index;
			isInsideComment = singleComment;
			index++;
		} else if (isInsideComment === singleComment && currentCharacter + nextCharacter === '\r\n') {
			// Exit single-line comment via \r\n
			index++;
			isInsideComment = false;
			buffer += strip(jsonString, offset, index);
			offset = index;
			continue;
		} else if (isInsideComment === singleComment && currentCharacter === '\n') {
			// Exit single-line comment via \n
			isInsideComment = false;
			buffer += strip(jsonString, offset, index);
			offset = index;
		} else if (!isInsideComment && currentCharacter + nextCharacter === '/*') {
			// Enter multiline comment
			buffer += jsonString.slice(offset, index);
			offset = index;
			isInsideComment = multiComment;
			index++;
			continue;
		} else if (isInsideComment === multiComment && currentCharacter + nextCharacter === '*/') {
			// Exit multiline comment
			index++;
			isInsideComment = false;
			buffer += strip(jsonString, offset, index + 1);
			offset = index + 1;
			continue;
		} else if (trailingCommas && !isInsideComment) {
			if (commaIndex !== -1) {
				if (currentCharacter === '}' || currentCharacter === ']') {
					// Strip trailing comma
					buffer += jsonString.slice(offset, index);
					result += strip(buffer, 0, 1) + buffer.slice(1);
					buffer = '';
					offset = index;
					commaIndex = -1;
				} else if (currentCharacter !== ' ' && currentCharacter !== '\t' && currentCharacter !== '\r' && currentCharacter !== '\n') {
					// Hit non-whitespace following a comma; comma is not trailing
					buffer += jsonString.slice(offset, index);
					offset = index;
					commaIndex = -1;
				}
			} else if (currentCharacter === ',') {
				// Flush buffer prior to this point, and save new comma index
				result += buffer + jsonString.slice(offset, index);
				buffer = '';
				offset = index;
				commaIndex = index;
			}
		}
	}

	return result + buffer + (isInsideComment ? strip(jsonString.slice(offset)) : jsonString.slice(offset));
}


/***/ })

/******/ 	});
/************************************************************************/
/******/ 	// The module cache
/******/ 	var __webpack_module_cache__ = {};
/******/ 	
/******/ 	// The require function
/******/ 	function __webpack_require__(moduleId) {
/******/ 		// Check if module is in cache
/******/ 		var cachedModule = __webpack_module_cache__[moduleId];
/******/ 		if (cachedModule !== undefined) {
/******/ 			return cachedModule.exports;
/******/ 		}
/******/ 		// Create a new module (and put it into the cache)
/******/ 		var module = __webpack_module_cache__[moduleId] = {
/******/ 			// no module.id needed
/******/ 			// no module.loaded needed
/******/ 			exports: {}
/******/ 		};
/******/ 	
/******/ 		// Execute the module function
/******/ 		__webpack_modules__[moduleId](module, module.exports, __webpack_require__);
/******/ 	
/******/ 		// Return the exports of the module
/******/ 		return module.exports;
/******/ 	}
/******/ 	
/************************************************************************/
/******/ 	/* webpack/runtime/define property getters */
/******/ 	(() => {
/******/ 		// define getter functions for harmony exports
/******/ 		__webpack_require__.d = (exports, definition) => {
/******/ 			for(var key in definition) {
/******/ 				if(__webpack_require__.o(definition, key) && !__webpack_require__.o(exports, key)) {
/******/ 					Object.defineProperty(exports, key, { enumerable: true, get: definition[key] });
/******/ 				}
/******/ 			}
/******/ 		};
/******/ 	})();
/******/ 	
/******/ 	/* webpack/runtime/hasOwnProperty shorthand */
/******/ 	(() => {
/******/ 		__webpack_require__.o = (obj, prop) => (Object.prototype.hasOwnProperty.call(obj, prop))
/******/ 	})();
/******/ 	
/******/ 	/* webpack/runtime/make namespace object */
/******/ 	(() => {
/******/ 		// define __esModule on exports
/******/ 		__webpack_require__.r = (exports) => {
/******/ 			if(typeof Symbol !== 'undefined' && Symbol.toStringTag) {
/******/ 				Object.defineProperty(exports, Symbol.toStringTag, { value: 'Module' });
/******/ 			}
/******/ 			Object.defineProperty(exports, '__esModule', { value: true });
/******/ 		};
/******/ 	})();
/******/ 	
/************************************************************************/
var __webpack_exports__ = {};
// This entry need to be wrapped in an IIFE because it need to be in strict mode.
(() => {
"use strict";
var exports = __webpack_exports__;
/*!**********************!*\
  !*** ./src/index.ts ***!
  \**********************/
//#!/usr/bin/env node

Object.defineProperty(exports, "__esModule", ({ value: true }));
var figlet = __webpack_require__(/*! figlet */ "./node_modules/figlet/lib/node-figlet.js");
var commander_1 = __webpack_require__(/*! commander */ "./node_modules/commander/index.js");
var util_1 = __webpack_require__(/*! ./util/ */ "./src/util/index.ts");
console.log(figlet.textSync('VSCode Launcher'));
var program = new commander_1.Command();
program.version('0.0.1')
    .option('--cwd [cwd]', 'The current working directory to use', process.cwd())
    .option('-c, --configuration-name <configuration>', 'The name of the configuration to launch')
    .option('-d, --debug', 'output extra debugging')
    .option('-l, --launchFile [launch-file]', 'The path to the launch.json file', '.vscode/launch.json')
    .description('Run a launch configuration from .vscode/launch.json')
    .parse(process.argv);
var options = program.opts();
options.debug && console.debug("Launching with options: ".concat(JSON.stringify(options)));
var launchFile = (0, util_1.readJsonFile)(options.launchFile);
(0, util_1.launch)(launchFile, options.configurationName);

})();

/******/ })()
;
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibWFpbi1idW5kbGUuanMiLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7OztBQUFBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FBRUE7QUFDQTs7QUFFQTtBQUNBO0FBQ0E7QUFDQTs7QUFFYTs7QUFFYjtBQUNBO0FBQ0E7O0FBRUE7QUFDQTtBQUNBO0FBQ0E7O0FBRUE7QUFDQTs7QUFFQSx1QkFBdUI7QUFDdkI7QUFDQTtBQUNBO0FBQ0E7O0FBRUE7QUFDQTs7QUFFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FBRUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EsUUFBUTtBQUNSO0FBQ0E7QUFDQTtBQUNBOztBQUVBO0FBQ0E7QUFDQTtBQUNBLFFBQVE7QUFDUjtBQUNBLFFBQVE7QUFDUjtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSxVQUFVO0FBQ1Y7QUFDQTtBQUNBO0FBQ0EsTUFBTTtBQUNOO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FBRUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EsUUFBUTtBQUNSO0FBQ0E7QUFDQSxNQUFNO0FBQ047QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FBRUE7QUFDQTs7QUFFQTs7QUFFQTtBQUNBOztBQUVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQUVBO0FBQ0E7O0FBRUE7QUFDQSw2QkFBNkIsS0FBSztBQUNsQztBQUNBO0FBQ0EsNEJBQTRCO0FBQzVCO0FBQ0E7QUFDQTtBQUNBO0FBQ0EsTUFBTTtBQUNOO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUFFQTtBQUNBOztBQUVBLG9FQUFvRTtBQUNwRTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0Esb0NBQW9DO0FBQ3BDO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FBRUE7QUFDQTs7QUFFQSxpRUFBaUU7QUFDakUsZUFBZTtBQUNmO0FBQ0E7QUFDQTtBQUNBLDBCQUEwQjtBQUMxQjtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FBRUE7QUFDQTs7QUFFQTtBQUNBO0FBQ0EsNENBQTRDO0FBQzVDO0FBQ0E7QUFDQTtBQUNBO0FBQ0Esc0JBQXNCO0FBQ3RCO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUFFQTtBQUNBOztBQUVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUFFQTtBQUNBOztBQUVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FBRUE7QUFDQTs7QUFFQTtBQUNBO0FBQ0E7QUFDQSw0QkFBNEI7QUFDNUI7QUFDQTtBQUNBO0FBQ0E7QUFDQSxNQUFNO0FBQ047QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQUVBO0FBQ0E7O0FBRUE7QUFDQTtBQUNBO0FBQ0Esb0NBQW9DO0FBQ3BDO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FBRUE7QUFDQTs7QUFFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUFFQTtBQUNBOztBQUVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FBRUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSxNQUFNO0FBQ047QUFDQSxNQUFNO0FBQ047QUFDQTtBQUNBOztBQUVBO0FBQ0E7O0FBRUE7QUFDQTtBQUNBO0FBQ0E7O0FBRUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQUVBLGlCQUFpQixVQUFVO0FBQzNCO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSxVQUFVO0FBQ1Y7QUFDQSxVQUFVO0FBQ1Y7QUFDQTtBQUNBO0FBQ0EsWUFBWTtBQUNaO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EsTUFBTTtBQUNOO0FBQ0E7QUFDQTs7QUFFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUFFQSwrQkFBK0I7QUFDL0I7QUFDQSxtQkFBbUIsV0FBVztBQUM5QjtBQUNBO0FBQ0E7QUFDQSxVQUFVO0FBQ1Y7QUFDQTtBQUNBLFVBQVU7QUFDVjtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQUVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FBRUE7QUFDQTs7QUFFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUFFQSxpQkFBaUIsVUFBVTtBQUMzQjtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EsVUFBVTtBQUNWO0FBQ0EsVUFBVTtBQUNWO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EsUUFBUTtBQUNSO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FBRUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFD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O0FBQ0E7QUFDQSxNQUFNO0FBQ047QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EsTUFBTTtBQUNOO0FBQ0E7QUFDQTtBQUNBOztBQUVBO0FBQ0E7QUFDQSxpQkFBaUI7QUFDakI7QUFDQTtBQUNBLG1CQUFtQixtQkFBbUI7QUFDdEM7QUFDQTtBQUNBLE1BQU07QUFDTjtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EsTUFBTTtBQUNOO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSxNQUFNO0FBQ047QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBLE1BQU07QUFDTjtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EsTUFBTTtBQUNOO0FBQ0E7QUFDQTtBQUNBOztBQUVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBLGlCQUFpQixVQUFVO0FBQzNCO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBLGlCQUFpQixVQUFVO0FBQzNCO0FBQ0E7O0FBRUE7QUFDQTs7QUFFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUFFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FBRUE7QUFDQTs7QUFFQTtBQUNBOztBQUVBO0FBQ0E7O0FBRUE7QUFDQTtBQUNBO0FBQ0E7O0FBRUE7QUFDQTtBQUNBO0FBQ0E7O0FBRUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FBRUE7QUFDQTs7QUFFQTtBQUNBO0FBQ0E7QUFDQSx1Q0FBdUM7QUFDdkM7O0FBRUE7QUFDQTtBQUNBO0FBQ0EsTUFBTTtBQUNOO0FBQ0E7QUFDQTs7QUFFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FBRUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUFFQTtBQUNBO0FBQ0EsT0FBTztBQUNQLEtBQUs7QUFDTDs7QUFFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FBRUE7QUFDQTs7QUFFQTtBQUNBO0FBQ0E7QUFDQSxNQUFNO0FBQ047QUFDQTtBQUNBOztBQUVBO0FBQ0E7QUFDQTs7QUFFQTtBQUNBOztBQUVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FBRUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FBRUE7QUFDQSxLQUFLO0FBQ0w7O0FBRUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQUVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUFFQTtBQUNBO0FBQ0E7QUFDQTs7QUFFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUFFQTs7QUFFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQUVBO0FBQ0E7QUFDQTs7QUFFQTtBQUNBO0FBQ0Esa0JBQWtCLFdBQVc7QUFDN0I7QUFDQTtBQUNBOztBQUVBO0FBQ0E7QUFDQTtBQUNBOztBQUVBO0FBQ0E7QUFDQTs7QUFFQTtBQUNBO0FBQ0E7O0FBRUE7QUFDQTs7QUFFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBLG1CQUFtQixrQkFBa0I7QUFDckM7QUFDQTtBQUNBLFVBQVU7QUFDVjtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUFFQTtBQUNBO0FBQ0E7O0FBRUE7QUFDQTtBQUNBO0FBQ0E7QUFDQSxRQUFRO0FBQ1I7QUFDQSxRQUFR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QTtBQUNBLElBQUk7QUFDSjtBQUNBO0FBQ0E7QUFDQTtBQUNBLElBQUk7QUFDSjtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSxJQUFJO0FBQ0o7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EsSUFBSTtBQUNKO0FBQ0EsK0JBQStCO0FBQy9CO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBLE1BQU07QUFDTiw4Q0FBOEM7QUFDOUM7QUFDQTtBQUNBO0FBQ0E7QUFDQSxLQUFLO0FBQ0w7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUFFQTtBQUNBOzs7Ozs7O1VDMUdBO1VBQ0E7O1VBRUE7VUFDQTtVQUNBO1VBQ0E7VUFDQTtVQUNBO1VBQ0E7VUFDQTtVQUNBO1VBQ0E7VUFDQTtVQUNBO1VBQ0E7O1VBRUE7VUFDQTs7VUFFQTtVQUNBO1VBQ0E7Ozs7O1dDdEJBO1dBQ0E7V0FDQTtXQUNBO1dBQ0EseUNBQXlDLHdDQUF3QztXQUNqRjtXQUNBO1dBQ0E7Ozs7O1dDUEE7Ozs7O1dDQUE7V0FDQTtXQUNBO1dBQ0EsdURBQXVELGlCQUFpQjtXQUN4RTtXQUNBLGdEQUFnRCxhQUFhO1dBQzdEOzs7Ozs7Ozs7Ozs7QUNOQTtBQUNhO0FBQ2IsOENBQTZDLEVBQUUsYUFBYSxFQUFDO0FBQzdELGFBQWEsbUJBQU8sQ0FBQyx3REFBUTtBQUM3QixrQkFBa0IsbUJBQU8sQ0FBQyxvREFBVztBQUNyQyxhQUFhLG1CQUFPLENBQUMsb0NBQVM7QUFDOUI7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EiLCJzb3VyY2VzIjpbIndlYnBhY2s6Ly92c2NvZGUtbGF1bmNoZXIvLi9ub2RlX21vZHVsZXMvZmlnbGV0L2xpYi9maWdsZXQuanMiLCJ3ZWJwYWNrOi8vdnNjb2RlLWxhdW5jaGVyLy4vbm9kZV9tb2R1bGVzL2ZpZ2xldC9saWIvbm9kZS1maWdsZXQuanMiLCJ3ZWJwYWNrOi8vdnNjb2RlLWxhdW5jaGVyLy4vc3JjL3V0aWwvaW5kZXgudHMiLCJ3ZWJwYWNrOi8vdnNjb2RlLWxhdW5jaGVyL2V4dGVybmFsIG5vZGUtY29tbW9uanMgXCJjaGlsZF9wcm9jZXNzXCIiLCJ3ZWJwYWNrOi8vdnNjb2RlLWxhdW5jaGVyL2V4dGVybmFsIG5vZGUtY29tbW9uanMgXCJmc1wiIiwid2VicGFjazovL3ZzY29kZS1sYXVuY2hlci9leHRlcm5hbCBub2RlLWNvbW1vbmpzIFwibm9kZTpjaGlsZF9wcm9jZXNzXCIiLCJ3ZWJwYWNrOi8vdnNjb2RlLWxhdW5jaGVyL2V4dGVybmFsIG5vZGUtY29tbW9uanMgXCJub2RlOmV2ZW50c1wiIiwid2VicGFjazovL3ZzY29kZS1sYXVuY2hlci9leHRlcm5hbCBub2RlLWNvbW1vbmpzIFwibm9kZTpmc1wiIiwid2VicGFjazovL3ZzY29kZS1sYXVuY2hlci9leHRlcm5hbCBub2RlLWNvbW1vbmpzIFwibm9kZTpvc1wiIiwid2VicGFjazovL3ZzY29kZS1sYXVuY2hlci9leHRlcm5hbCBub2RlLWNvbW1vbmpzIFwibm9kZTpwYXRoXCIiLCJ3ZWJwYWNrOi8vdnNjb2RlLWxhdW5jaGVyL2V4dGVybmFsIG5vZGUtY29tbW9uanMgXCJub2RlOnByb2Nlc3NcIiIsIndlYnBhY2s6Ly92c2NvZGUtbGF1bmNoZXIvZXh0ZXJuYWwgbm9kZS1jb21tb25qcyBcIm5vZGU6dHR5XCIiLCJ3ZWJwYWNrOi8vdnNjb2RlLWxhdW5jaGVyL2V4dGVybmFsIG5vZGUtY29tbW9uanMgXCJwYXRoXCIiLCJ3ZWJwYWNrOi8vdnNjb2RlLWxhdW5jaGVyLy4vbm9kZV9tb2R1bGVzL2NvbW1hbmRlci9pbmRleC5qcyIsIndlYnBhY2s6Ly92c2NvZGUtbGF1bmNoZXIvLi9ub2RlX21vZHVsZXMvY29tbWFuZGVyL2xpYi9hcmd1bWVudC5qcyIsIndlYnBhY2s6Ly92c2NvZGUtbGF1bmNoZXIvLi9ub2RlX21vZHVsZXMvY29tbWFuZGVyL2xpYi9jb21tYW5kLmpzIiwid2VicGFjazovL3ZzY29kZS1sYXVuY2hlci8uL25vZGVfbW9kdWxlcy9jb21tYW5kZXIvbGliL2Vycm9yLmpzIiwid2VicGFjazovL3ZzY29kZS1sYXVuY2hlci8uL25vZGVfbW9kdWxlcy9jb21tYW5kZXIvbGliL2hlbHAuanMiLCJ3ZWJwYWNrOi8vdnNjb2RlLWxhdW5jaGVyLy4vbm9kZV9tb2R1bGVzL2NvbW1hbmRlci9saWIvb3B0aW9uLmpzIiwid2VicGFjazovL3ZzY29kZS1sYXVuY2hlci8uL25vZGVfbW9kdWxlcy9jb21tYW5kZXIvbGliL3N1Z2dlc3RTaW1pbGFyLmpzIiwid2VicGFjazovL3ZzY29kZS1sYXVuY2hlci8uL25vZGVfbW9kdWxlcy9jaGFsay9zb3VyY2UvaW5kZXguanMiLCJ3ZWJwYWNrOi8vdnNjb2RlLWxhdW5jaGVyLy4vbm9kZV9tb2R1bGVzL2NoYWxrL3NvdXJjZS91dGlsaXRpZXMuanMiLCJ3ZWJwYWNrOi8vdnNjb2RlLWxhdW5jaGVyLy4vbm9kZV9tb2R1bGVzL2NoYWxrL3NvdXJjZS92ZW5kb3IvYW5zaS1zdHlsZXMvaW5kZXguanMiLCJ3ZWJwYWNrOi8vdnNjb2RlLWxhdW5jaGVyLy4vbm9kZV9tb2R1bGVzL2NoYWxrL3NvdXJjZS92ZW5kb3Ivc3VwcG9ydHMtY29sb3IvaW5kZXguanMiLCJ3ZWJwYWNrOi8vdnNjb2RlLWxhdW5jaGVyLy4vbm9kZV9tb2R1bGVzL3N0cmlwLWpzb24tY29tbWVudHMvaW5kZXguanMiLCJ3ZWJwYWNrOi8vdnNjb2RlLWxhdW5jaGVyL3dlYnBhY2svYm9vdHN0cmFwIiwid2VicGFjazovL3ZzY29kZS1sYXVuY2hlci93ZWJwYWNrL3J1bnRpbWUvZGVmaW5lIHByb3BlcnR5IGdldHRlcnMiLCJ3ZWJwYWNrOi8vdnNjb2RlLWxhdW5jaGVyL3dlYnBhY2svcnVudGltZS9oYXNPd25Qcm9wZXJ0eSBzaG9ydGhhbmQiLCJ3ZWJwYWNrOi8vdnNjb2RlLWxhdW5jaGVyL3dlYnBhY2svcnVudGltZS9tYWtlIG5hbWVzcGFjZSBvYmplY3QiLCJ3ZWJwYWNrOi8vdnNjb2RlLWxhdW5jaGVyLy4vc3JjL2luZGV4LnRzIl0sInNvdXJjZXNDb250ZW50IjpbIi8qXG4gICAgRklHbGV0LmpzIChhIEZJR0RyaXZlciBmb3IgRklHbGV0IGZvbnRzKVxuICAgIFdyaXR0ZW4gYnkgaHR0cHM6Ly9naXRodWIuY29tL3BhdG9yamsvZmlnbGV0LmpzL2dyYXBocy9jb250cmlidXRvcnNcbiAgICBPcmlnaW5hbGx5IFdyaXR0ZW4gRm9yOiBodHRwOi8vcGF0b3Jqay5jb20vc29mdHdhcmUvdGFhZy9cbiAgICBMaWNlbnNlOiBNSVQgKHdpdGggdGhpcyBoZWFkZXIgc3RheWluZyBpbnRhY3QpXG5cbiAgICBUaGlzIEphdmFTY3JpcHQgY29kZSBhaW1zIHRvIGZ1bGx5IGltcGxlbWVudCB0aGUgRklHbGV0IHNwZWMuXG4gICAgRnVsbCBGSUdsZXQgc3BlYzogaHR0cDovL3BhdG9yamsuY29tL3NvZnR3YXJlL3RhYWcvZG9jcy9maWdmb250LnR4dFxuXG4gICAgRklHbGV0IGZvbnRzIGFyZSBhY3R1YWxseSBraW5kIG9mIGNvbXBsZXgsIHdoaWNoIGlzIHdoeSB5b3Ugd2lsbCBzZWVcbiAgICBhIGxvdCBvZiBjb2RlIGFib3V0IHBhcnNpbmcgYW5kIGludGVycHJldGluZyBydWxlcy4gVGhlIGFjdHVhbCBnZW5lcmF0aW9uXG4gICAgY29kZSBpcyBwcmV0dHkgc2ltcGxlIGFuZCBpcyBkb25lIG5lYXIgdGhlIGJvdHRvbSBvZiB0aGUgY29kZS5cbiovXG5cblwidXNlIHN0cmljdFwiO1xuXG5jb25zdCBmaWdsZXQgPSAoKCkgPT4ge1xuICAvLyAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cbiAgLy8gUHJpdmF0ZSBzdGF0aWMgdmFyaWFibGVzXG5cbiAgY29uc3QgRlVMTF9XSURUSCA9IDAsXG4gICAgRklUVElORyA9IDEsXG4gICAgU01VU0hJTkcgPSAyLFxuICAgIENPTlRST0xMRURfU01VU0hJTkcgPSAzO1xuXG4gIC8vIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuICAvLyBWYXJpYWJsZSB0aGF0IHdpbGwgaG9sZCBpbmZvcm1hdGlvbiBhYm91dCB0aGUgZm9udHNcblxuICBjb25zdCBmaWdGb250cyA9IHt9OyAvLyBXaGF0IHN0b3JlcyBhbGwgb2YgdGhlIEZJR2xldCBmb250IGRhdGFcbiAgY29uc3QgZmlnRGVmYXVsdHMgPSB7XG4gICAgZm9udDogXCJTdGFuZGFyZFwiLFxuICAgIGZvbnRQYXRoOiBcIi4vZm9udHNcIixcbiAgfTtcblxuICAvLyAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cbiAgLy8gUHJpdmF0ZSBzdGF0aWMgbWV0aG9kc1xuXG4gIC8qXG4gICAgICAgIFRoaXMgbWV0aG9kIHRha2VzIGluIHRoZSBvbGRMYXlvdXQgYW5kIG5ld0xheW91dCBkYXRhIGZyb20gdGhlIEZJR2ZvbnQgaGVhZGVyIGZpbGUgYW5kIHJldHVybnNcbiAgICAgICAgdGhlIGxheW91dCBpbmZvcm1hdGlvbi5cbiAgICAqL1xuICBmdW5jdGlvbiBnZXRTbXVzaGluZ1J1bGVzKG9sZExheW91dCwgbmV3TGF5b3V0KSB7XG4gICAgbGV0IHJ1bGVzID0ge307XG4gICAgbGV0IHZhbCwgaW5kZXgsIGxlbiwgY29kZTtcbiAgICBsZXQgY29kZXMgPSBbXG4gICAgICBbMTYzODQsIFwidkxheW91dFwiLCBTTVVTSElOR10sXG4gICAgICBbODE5MiwgXCJ2TGF5b3V0XCIsIEZJVFRJTkddLFxuICAgICAgWzQwOTYsIFwidlJ1bGU1XCIsIHRydWVdLFxuICAgICAgWzIwNDgsIFwidlJ1bGU0XCIsIHRydWVdLFxuICAgICAgWzEwMjQsIFwidlJ1bGUzXCIsIHRydWVdLFxuICAgICAgWzUxMiwgXCJ2UnVsZTJcIiwgdHJ1ZV0sXG4gICAgICBbMjU2LCBcInZSdWxlMVwiLCB0cnVlXSxcbiAgICAgIFsxMjgsIFwiaExheW91dFwiLCBTTVVTSElOR10sXG4gICAgICBbNjQsIFwiaExheW91dFwiLCBGSVRUSU5HXSxcbiAgICAgIFszMiwgXCJoUnVsZTZcIiwgdHJ1ZV0sXG4gICAgICBbMTYsIFwiaFJ1bGU1XCIsIHRydWVdLFxuICAgICAgWzgsIFwiaFJ1bGU0XCIsIHRydWVdLFxuICAgICAgWzQsIFwiaFJ1bGUzXCIsIHRydWVdLFxuICAgICAgWzIsIFwiaFJ1bGUyXCIsIHRydWVdLFxuICAgICAgWzEsIFwiaFJ1bGUxXCIsIHRydWVdLFxuICAgIF07XG5cbiAgICB2YWwgPSBuZXdMYXlvdXQgIT09IG51bGwgPyBuZXdMYXlvdXQgOiBvbGRMYXlvdXQ7XG4gICAgaW5kZXggPSAwO1xuICAgIGxlbiA9IGNvZGVzLmxlbmd0aDtcbiAgICB3aGlsZSAoaW5kZXggPCBsZW4pIHtcbiAgICAgIGNvZGUgPSBjb2Rlc1tpbmRleF07XG4gICAgICBpZiAodmFsID49IGNvZGVbMF0pIHtcbiAgICAgICAgdmFsID0gdmFsIC0gY29kZVswXTtcbiAgICAgICAgcnVsZXNbY29kZVsxXV0gPVxuICAgICAgICAgIHR5cGVvZiBydWxlc1tjb2RlWzFdXSA9PT0gXCJ1bmRlZmluZWRcIiA/IGNvZGVbMl0gOiBydWxlc1tjb2RlWzFdXTtcbiAgICAgIH0gZWxzZSBpZiAoY29kZVsxXSAhPT0gXCJ2TGF5b3V0XCIgJiYgY29kZVsxXSAhPT0gXCJoTGF5b3V0XCIpIHtcbiAgICAgICAgcnVsZXNbY29kZVsxXV0gPSBmYWxzZTtcbiAgICAgIH1cbiAgICAgIGluZGV4Kys7XG4gICAgfVxuXG4gICAgaWYgKHR5cGVvZiBydWxlc1tcImhMYXlvdXRcIl0gPT09IFwidW5kZWZpbmVkXCIpIHtcbiAgICAgIGlmIChvbGRMYXlvdXQgPT09IDApIHtcbiAgICAgICAgcnVsZXNbXCJoTGF5b3V0XCJdID0gRklUVElORztcbiAgICAgIH0gZWxzZSBpZiAob2xkTGF5b3V0ID09PSAtMSkge1xuICAgICAgICBydWxlc1tcImhMYXlvdXRcIl0gPSBGVUxMX1dJRFRIO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgaWYgKFxuICAgICAgICAgIHJ1bGVzW1wiaFJ1bGUxXCJdIHx8XG4gICAgICAgICAgcnVsZXNbXCJoUnVsZTJcIl0gfHxcbiAgICAgICAgICBydWxlc1tcImhSdWxlM1wiXSB8fFxuICAgICAgICAgIHJ1bGVzW1wiaFJ1bGU0XCJdIHx8XG4gICAgICAgICAgcnVsZXNbXCJoUnVsZTVcIl0gfHxcbiAgICAgICAgICBydWxlc1tcImhSdWxlNlwiXVxuICAgICAgICApIHtcbiAgICAgICAgICBydWxlc1tcImhMYXlvdXRcIl0gPSBDT05UUk9MTEVEX1NNVVNISU5HO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIHJ1bGVzW1wiaExheW91dFwiXSA9IFNNVVNISU5HO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgfSBlbHNlIGlmIChydWxlc1tcImhMYXlvdXRcIl0gPT09IFNNVVNISU5HKSB7XG4gICAgICBpZiAoXG4gICAgICAgIHJ1bGVzW1wiaFJ1bGUxXCJdIHx8XG4gICAgICAgIHJ1bGVzW1wiaFJ1bGUyXCJdIHx8XG4gICAgICAgIHJ1bGVzW1wiaFJ1bGUzXCJdIHx8XG4gICAgICAgIHJ1bGVzW1wiaFJ1bGU0XCJdIHx8XG4gICAgICAgIHJ1bGVzW1wiaFJ1bGU1XCJdIHx8XG4gICAgICAgIHJ1bGVzW1wiaFJ1bGU2XCJdXG4gICAgICApIHtcbiAgICAgICAgcnVsZXNbXCJoTGF5b3V0XCJdID0gQ09OVFJPTExFRF9TTVVTSElORztcbiAgICAgIH1cbiAgICB9XG5cbiAgICBpZiAodHlwZW9mIHJ1bGVzW1widkxheW91dFwiXSA9PT0gXCJ1bmRlZmluZWRcIikge1xuICAgICAgaWYgKFxuICAgICAgICBydWxlc1tcInZSdWxlMVwiXSB8fFxuICAgICAgICBydWxlc1tcInZSdWxlMlwiXSB8fFxuICAgICAgICBydWxlc1tcInZSdWxlM1wiXSB8fFxuICAgICAgICBydWxlc1tcInZSdWxlNFwiXSB8fFxuICAgICAgICBydWxlc1tcInZSdWxlNVwiXVxuICAgICAgKSB7XG4gICAgICAgIHJ1bGVzW1widkxheW91dFwiXSA9IENPTlRST0xMRURfU01VU0hJTkc7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICBydWxlc1tcInZMYXlvdXRcIl0gPSBGVUxMX1dJRFRIO1xuICAgICAgfVxuICAgIH0gZWxzZSBpZiAocnVsZXNbXCJ2TGF5b3V0XCJdID09PSBTTVVTSElORykge1xuICAgICAgaWYgKFxuICAgICAgICBydWxlc1tcInZSdWxlMVwiXSB8fFxuICAgICAgICBydWxlc1tcInZSdWxlMlwiXSB8fFxuICAgICAgICBydWxlc1tcInZSdWxlM1wiXSB8fFxuICAgICAgICBydWxlc1tcInZSdWxlNFwiXSB8fFxuICAgICAgICBydWxlc1tcInZSdWxlNVwiXVxuICAgICAgKSB7XG4gICAgICAgIHJ1bGVzW1widkxheW91dFwiXSA9IENPTlRST0xMRURfU01VU0hJTkc7XG4gICAgICB9XG4gICAgfVxuXG4gICAgcmV0dXJuIHJ1bGVzO1xuICB9XG5cbiAgLyogVGhlIFt2aF1SdWxlWzEtNl1fU211c2ggZnVuY3Rpb25zIHJldHVybiB0aGUgc211c2hlZCBjaGFyYWN0ZXIgT1IgZmFsc2UgaWYgdGhlIHR3byBjaGFyYWN0ZXJzIGNhbid0IGJlIHNtdXNoZWQgKi9cblxuICAvKlxuICAgICAgICBSdWxlIDE6IEVRVUFMIENIQVJBQ1RFUiBTTVVTSElORyAoY29kZSB2YWx1ZSAxKVxuXG4gICAgICAgICAgICBUd28gc3ViLWNoYXJhY3RlcnMgYXJlIHNtdXNoZWQgaW50byBhIHNpbmdsZSBzdWItY2hhcmFjdGVyXG4gICAgICAgICAgICBpZiB0aGV5IGFyZSB0aGUgc2FtZS4gIFRoaXMgcnVsZSBkb2VzIG5vdCBzbXVzaFxuICAgICAgICAgICAgaGFyZGJsYW5rcy4gIChTZWUgcnVsZSA2IG9uIGhhcmRibGFua3MgYmVsb3cpXG4gICAgKi9cbiAgZnVuY3Rpb24gaFJ1bGUxX1NtdXNoKGNoMSwgY2gyLCBoYXJkQmxhbmspIHtcbiAgICBpZiAoY2gxID09PSBjaDIgJiYgY2gxICE9PSBoYXJkQmxhbmspIHtcbiAgICAgIHJldHVybiBjaDE7XG4gICAgfVxuICAgIHJldHVybiBmYWxzZTtcbiAgfVxuXG4gIC8qXG4gICAgICAgIFJ1bGUgMjogVU5ERVJTQ09SRSBTTVVTSElORyAoY29kZSB2YWx1ZSAyKVxuXG4gICAgICAgICAgICBBbiB1bmRlcnNjb3JlIChcIl9cIikgd2lsbCBiZSByZXBsYWNlZCBieSBhbnkgb2Y6IFwifFwiLCBcIi9cIixcbiAgICAgICAgICAgIFwiXFxcIiwgXCJbXCIsIFwiXVwiLCBcIntcIiwgXCJ9XCIsIFwiKFwiLCBcIilcIiwgXCI8XCIgb3IgXCI+XCIuXG4gICAgKi9cbiAgZnVuY3Rpb24gaFJ1bGUyX1NtdXNoKGNoMSwgY2gyKSB7XG4gICAgbGV0IHJ1bGUyU3RyID0gXCJ8L1xcXFxbXXt9KCk8PlwiO1xuICAgIGlmIChjaDEgPT09IFwiX1wiKSB7XG4gICAgICBpZiAocnVsZTJTdHIuaW5kZXhPZihjaDIpICE9PSAtMSkge1xuICAgICAgICByZXR1cm4gY2gyO1xuICAgICAgfVxuICAgIH0gZWxzZSBpZiAoY2gyID09PSBcIl9cIikge1xuICAgICAgaWYgKHJ1bGUyU3RyLmluZGV4T2YoY2gxKSAhPT0gLTEpIHtcbiAgICAgICAgcmV0dXJuIGNoMTtcbiAgICAgIH1cbiAgICB9XG4gICAgcmV0dXJuIGZhbHNlO1xuICB9XG5cbiAgLypcbiAgICAgICAgUnVsZSAzOiBISUVSQVJDSFkgU01VU0hJTkcgKGNvZGUgdmFsdWUgNClcblxuICAgICAgICAgICAgQSBoaWVyYXJjaHkgb2Ygc2l4IGNsYXNzZXMgaXMgdXNlZDogXCJ8XCIsIFwiL1xcXCIsIFwiW11cIiwgXCJ7fVwiLFxuICAgICAgICAgICAgXCIoKVwiLCBhbmQgXCI8PlwiLiAgV2hlbiB0d28gc211c2hpbmcgc3ViLWNoYXJhY3RlcnMgYXJlXG4gICAgICAgICAgICBmcm9tIGRpZmZlcmVudCBjbGFzc2VzLCB0aGUgb25lIGZyb20gdGhlIGxhdHRlciBjbGFzc1xuICAgICAgICAgICAgd2lsbCBiZSB1c2VkLlxuICAgICovXG4gIGZ1bmN0aW9uIGhSdWxlM19TbXVzaChjaDEsIGNoMikge1xuICAgIGxldCBydWxlM0NsYXNzZXMgPSBcInwgL1xcXFwgW10ge30gKCkgPD5cIjtcbiAgICBsZXQgcjNfcG9zMSA9IHJ1bGUzQ2xhc3Nlcy5pbmRleE9mKGNoMSk7XG4gICAgbGV0IHIzX3BvczIgPSBydWxlM0NsYXNzZXMuaW5kZXhPZihjaDIpO1xuICAgIGlmIChyM19wb3MxICE9PSAtMSAmJiByM19wb3MyICE9PSAtMSkge1xuICAgICAgaWYgKHIzX3BvczEgIT09IHIzX3BvczIgJiYgTWF0aC5hYnMocjNfcG9zMSAtIHIzX3BvczIpICE9PSAxKSB7XG4gICAgICAgIGNvbnN0IHN0YXJ0UG9zID0gTWF0aC5tYXgocjNfcG9zMSwgcjNfcG9zMik7XG4gICAgICAgIGNvbnN0IGVuZFBvcyA9IHN0YXJ0UG9zICsgMTtcbiAgICAgICAgcmV0dXJuIHJ1bGUzQ2xhc3Nlcy5zdWJzdHJpbmcoc3RhcnRQb3MsIGVuZFBvcyk7XG4gICAgICB9XG4gICAgfVxuICAgIHJldHVybiBmYWxzZTtcbiAgfVxuXG4gIC8qXG4gICAgICAgIFJ1bGUgNDogT1BQT1NJVEUgUEFJUiBTTVVTSElORyAoY29kZSB2YWx1ZSA4KVxuXG4gICAgICAgICAgICBTbXVzaGVzIG9wcG9zaW5nIGJyYWNrZXRzIChcIltdXCIgb3IgXCJdW1wiKSwgYnJhY2VzIChcInt9XCIgb3JcbiAgICAgICAgICAgIFwifXtcIikgYW5kIHBhcmVudGhlc2VzIChcIigpXCIgb3IgXCIpKFwiKSB0b2dldGhlciwgcmVwbGFjaW5nXG4gICAgICAgICAgICBhbnkgc3VjaCBwYWlyIHdpdGggYSB2ZXJ0aWNhbCBiYXIgKFwifFwiKS5cbiAgICAqL1xuICBmdW5jdGlvbiBoUnVsZTRfU211c2goY2gxLCBjaDIpIHtcbiAgICBsZXQgcnVsZTRTdHIgPSBcIltdIHt9ICgpXCI7XG4gICAgbGV0IHI0X3BvczEgPSBydWxlNFN0ci5pbmRleE9mKGNoMSk7XG4gICAgbGV0IHI0X3BvczIgPSBydWxlNFN0ci5pbmRleE9mKGNoMik7XG4gICAgaWYgKHI0X3BvczEgIT09IC0xICYmIHI0X3BvczIgIT09IC0xKSB7XG4gICAgICBpZiAoTWF0aC5hYnMocjRfcG9zMSAtIHI0X3BvczIpIDw9IDEpIHtcbiAgICAgICAgcmV0dXJuIFwifFwiO1xuICAgICAgfVxuICAgIH1cbiAgICByZXR1cm4gZmFsc2U7XG4gIH1cblxuICAvKlxuICAgICAgICBSdWxlIDU6IEJJRyBYIFNNVVNISU5HIChjb2RlIHZhbHVlIDE2KVxuXG4gICAgICAgICAgICBTbXVzaGVzIFwiL1xcXCIgaW50byBcInxcIiwgXCJcXC9cIiBpbnRvIFwiWVwiLCBhbmQgXCI+PFwiIGludG8gXCJYXCIuXG4gICAgICAgICAgICBOb3RlIHRoYXQgXCI8PlwiIGlzIG5vdCBzbXVzaGVkIGluIGFueSB3YXkgYnkgdGhpcyBydWxlLlxuICAgICAgICAgICAgVGhlIG5hbWUgXCJCSUcgWFwiIGlzIGhpc3RvcmljYWw7IG9yaWdpbmFsbHkgYWxsIHRocmVlIHBhaXJzXG4gICAgICAgICAgICB3ZXJlIHNtdXNoZWQgaW50byBcIlhcIi5cbiAgICAqL1xuICBmdW5jdGlvbiBoUnVsZTVfU211c2goY2gxLCBjaDIpIHtcbiAgICBsZXQgcnVsZTVTdHIgPSBcIi9cXFxcIFxcXFwvID48XCI7XG4gICAgbGV0IHJ1bGU1SGFzaCA9IHsgMDogXCJ8XCIsIDM6IFwiWVwiLCA2OiBcIlhcIiB9O1xuICAgIGxldCByNV9wb3MxID0gcnVsZTVTdHIuaW5kZXhPZihjaDEpO1xuICAgIGxldCByNV9wb3MyID0gcnVsZTVTdHIuaW5kZXhPZihjaDIpO1xuICAgIGlmIChyNV9wb3MxICE9PSAtMSAmJiByNV9wb3MyICE9PSAtMSkge1xuICAgICAgaWYgKHI1X3BvczIgLSByNV9wb3MxID09PSAxKSB7XG4gICAgICAgIHJldHVybiBydWxlNUhhc2hbcjVfcG9zMV07XG4gICAgICB9XG4gICAgfVxuICAgIHJldHVybiBmYWxzZTtcbiAgfVxuXG4gIC8qXG4gICAgICAgIFJ1bGUgNjogSEFSREJMQU5LIFNNVVNISU5HIChjb2RlIHZhbHVlIDMyKVxuXG4gICAgICAgICAgICBTbXVzaGVzIHR3byBoYXJkYmxhbmtzIHRvZ2V0aGVyLCByZXBsYWNpbmcgdGhlbSB3aXRoIGFcbiAgICAgICAgICAgIHNpbmdsZSBoYXJkYmxhbmsuICAoU2VlIFwiSGFyZGJsYW5rc1wiIGJlbG93LilcbiAgICAqL1xuICBmdW5jdGlvbiBoUnVsZTZfU211c2goY2gxLCBjaDIsIGhhcmRCbGFuaykge1xuICAgIGlmIChjaDEgPT09IGhhcmRCbGFuayAmJiBjaDIgPT09IGhhcmRCbGFuaykge1xuICAgICAgcmV0dXJuIGhhcmRCbGFuaztcbiAgICB9XG4gICAgcmV0dXJuIGZhbHNlO1xuICB9XG5cbiAgLypcbiAgICAgICAgUnVsZSAxOiBFUVVBTCBDSEFSQUNURVIgU01VU0hJTkcgKGNvZGUgdmFsdWUgMjU2KVxuXG4gICAgICAgICAgICBTYW1lIGFzIGhvcml6b250YWwgc211c2hpbmcgcnVsZSAxLlxuICAgICovXG4gIGZ1bmN0aW9uIHZSdWxlMV9TbXVzaChjaDEsIGNoMikge1xuICAgIGlmIChjaDEgPT09IGNoMikge1xuICAgICAgcmV0dXJuIGNoMTtcbiAgICB9XG4gICAgcmV0dXJuIGZhbHNlO1xuICB9XG5cbiAgLypcbiAgICAgICAgUnVsZSAyOiBVTkRFUlNDT1JFIFNNVVNISU5HIChjb2RlIHZhbHVlIDUxMilcblxuICAgICAgICAgICAgU2FtZSBhcyBob3Jpem9udGFsIHNtdXNoaW5nIHJ1bGUgMi5cbiAgICAqL1xuICBmdW5jdGlvbiB2UnVsZTJfU211c2goY2gxLCBjaDIpIHtcbiAgICBsZXQgcnVsZTJTdHIgPSBcInwvXFxcXFtde30oKTw+XCI7XG4gICAgaWYgKGNoMSA9PT0gXCJfXCIpIHtcbiAgICAgIGlmIChydWxlMlN0ci5pbmRleE9mKGNoMikgIT09IC0xKSB7XG4gICAgICAgIHJldHVybiBjaDI7XG4gICAgICB9XG4gICAgfSBlbHNlIGlmIChjaDIgPT09IFwiX1wiKSB7XG4gICAgICBpZiAocnVsZTJTdHIuaW5kZXhPZihjaDEpICE9PSAtMSkge1xuICAgICAgICByZXR1cm4gY2gxO1xuICAgICAgfVxuICAgIH1cbiAgICByZXR1cm4gZmFsc2U7XG4gIH1cblxuICAvKlxuICAgICAgICBSdWxlIDM6IEhJRVJBUkNIWSBTTVVTSElORyAoY29kZSB2YWx1ZSAxMDI0KVxuXG4gICAgICAgICAgICBTYW1lIGFzIGhvcml6b250YWwgc211c2hpbmcgcnVsZSAzLlxuICAgICovXG4gIGZ1bmN0aW9uIHZSdWxlM19TbXVzaChjaDEsIGNoMikge1xuICAgIGxldCBydWxlM0NsYXNzZXMgPSBcInwgL1xcXFwgW10ge30gKCkgPD5cIjtcbiAgICBsZXQgcjNfcG9zMSA9IHJ1bGUzQ2xhc3Nlcy5pbmRleE9mKGNoMSk7XG4gICAgbGV0IHIzX3BvczIgPSBydWxlM0NsYXNzZXMuaW5kZXhPZihjaDIpO1xuICAgIGlmIChyM19wb3MxICE9PSAtMSAmJiByM19wb3MyICE9PSAtMSkge1xuICAgICAgaWYgKHIzX3BvczEgIT09IHIzX3BvczIgJiYgTWF0aC5hYnMocjNfcG9zMSAtIHIzX3BvczIpICE9PSAxKSB7XG4gICAgICAgIGNvbnN0IHN0YXJ0UG9zID0gTWF0aC5tYXgocjNfcG9zMSwgcjNfcG9zMik7XG4gICAgICAgIGNvbnN0IGVuZFBvcyA9IHN0YXJ0UG9zICsgMTtcbiAgICAgICAgcmV0dXJuIHJ1bGUzQ2xhc3Nlcy5zdWJzdHJpbmcoc3RhcnRQb3MsIGVuZFBvcyk7XG4gICAgICB9XG4gICAgfVxuICAgIHJldHVybiBmYWxzZTtcbiAgfVxuXG4gIC8qXG4gICAgICAgIFJ1bGUgNDogSE9SSVpPTlRBTCBMSU5FIFNNVVNISU5HIChjb2RlIHZhbHVlIDIwNDgpXG5cbiAgICAgICAgICAgIFNtdXNoZXMgc3RhY2tlZCBwYWlycyBvZiBcIi1cIiBhbmQgXCJfXCIsIHJlcGxhY2luZyB0aGVtIHdpdGhcbiAgICAgICAgICAgIGEgc2luZ2xlIFwiPVwiIHN1Yi1jaGFyYWN0ZXIuICBJdCBkb2VzIG5vdCBtYXR0ZXIgd2hpY2ggaXNcbiAgICAgICAgICAgIGZvdW5kIGFib3ZlIHRoZSBvdGhlci4gIE5vdGUgdGhhdCB2ZXJ0aWNhbCBzbXVzaGluZyBydWxlIDFcbiAgICAgICAgICAgIHdpbGwgc211c2ggSURFTlRJQ0FMIHBhaXJzIG9mIGhvcml6b250YWwgbGluZXMsIHdoaWxlIHRoaXNcbiAgICAgICAgICAgIHJ1bGUgc211c2hlcyBob3Jpem9udGFsIGxpbmVzIGNvbnNpc3Rpbmcgb2YgRElGRkVSRU5UXG4gICAgICAgICAgICBzdWItY2hhcmFjdGVycy5cbiAgICAqL1xuICBmdW5jdGlvbiB2UnVsZTRfU211c2goY2gxLCBjaDIpIHtcbiAgICBpZiAoKGNoMSA9PT0gXCItXCIgJiYgY2gyID09PSBcIl9cIikgfHwgKGNoMSA9PT0gXCJfXCIgJiYgY2gyID09PSBcIi1cIikpIHtcbiAgICAgIHJldHVybiBcIj1cIjtcbiAgICB9XG4gICAgcmV0dXJuIGZhbHNlO1xuICB9XG5cbiAgLypcbiAgICAgICAgUnVsZSA1OiBWRVJUSUNBTCBMSU5FIFNVUEVSU01VU0hJTkcgKGNvZGUgdmFsdWUgNDA5NilcblxuICAgICAgICAgICAgVGhpcyBvbmUgcnVsZSBpcyBkaWZmZXJlbnQgZnJvbSBhbGwgb3RoZXJzLCBpbiB0aGF0IGl0XG4gICAgICAgICAgICBcInN1cGVyc211c2hlc1wiIHZlcnRpY2FsIGxpbmVzIGNvbnNpc3Rpbmcgb2Ygc2V2ZXJhbFxuICAgICAgICAgICAgdmVydGljYWwgYmFycyAoXCJ8XCIpLiAgVGhpcyBjcmVhdGVzIHRoZSBpbGx1c2lvbiB0aGF0XG4gICAgICAgICAgICBGSUdjaGFyYWN0ZXJzIGhhdmUgc2xpZCB2ZXJ0aWNhbGx5IGFnYWluc3QgZWFjaCBvdGhlci5cbiAgICAgICAgICAgIFN1cGVyc211c2hpbmcgY29udGludWVzIHVudGlsIGFueSBzdWItY2hhcmFjdGVycyBvdGhlclxuICAgICAgICAgICAgdGhhbiBcInxcIiB3b3VsZCBoYXZlIHRvIGJlIHNtdXNoZWQuICBTdXBlcnNtdXNoaW5nIGNhblxuICAgICAgICAgICAgcHJvZHVjZSBpbXByZXNzaXZlIHJlc3VsdHMsIGJ1dCBpdCBpcyBzZWxkb20gcG9zc2libGUsXG4gICAgICAgICAgICBzaW5jZSBvdGhlciBzdWItY2hhcmFjdGVycyB3b3VsZCB1c3VhbGx5IGhhdmUgdG8gYmVcbiAgICAgICAgICAgIGNvbnNpZGVyZWQgZm9yIHNtdXNoaW5nIGFzIHNvb24gYXMgYW55IHN1Y2ggc3RhY2tlZFxuICAgICAgICAgICAgdmVydGljYWwgbGluZXMgYXJlIGVuY291bnRlcmVkLlxuICAgICovXG4gIGZ1bmN0aW9uIHZSdWxlNV9TbXVzaChjaDEsIGNoMikge1xuICAgIGlmIChjaDEgPT09IFwifFwiICYmIGNoMiA9PT0gXCJ8XCIpIHtcbiAgICAgIHJldHVybiBcInxcIjtcbiAgICB9XG4gICAgcmV0dXJuIGZhbHNlO1xuICB9XG5cbiAgLypcbiAgICAgICAgVW5pdmVyc2FsIHNtdXNoaW5nIHNpbXBseSBvdmVycmlkZXMgdGhlIHN1Yi1jaGFyYWN0ZXIgZnJvbSB0aGVcbiAgICAgICAgZWFybGllciBGSUdjaGFyYWN0ZXIgd2l0aCB0aGUgc3ViLWNoYXJhY3RlciBmcm9tIHRoZSBsYXRlclxuICAgICAgICBGSUdjaGFyYWN0ZXIuICBUaGlzIHByb2R1Y2VzIGFuIFwib3ZlcmxhcHBpbmdcIiBlZmZlY3Qgd2l0aCBzb21lXG4gICAgICAgIEZJR2ZvbnRzLCB3aGVyaW4gdGhlIGxhdHRlciBGSUdjaGFyYWN0ZXIgbWF5IGFwcGVhciB0byBiZSBcImluXG4gICAgICAgIGZyb250XCIuXG4gICAgKi9cbiAgZnVuY3Rpb24gdW5pX1NtdXNoKGNoMSwgY2gyLCBoYXJkQmxhbmspIHtcbiAgICBpZiAoY2gyID09PSBcIiBcIiB8fCBjaDIgPT09IFwiXCIpIHtcbiAgICAgIHJldHVybiBjaDE7XG4gICAgfSBlbHNlIGlmIChjaDIgPT09IGhhcmRCbGFuayAmJiBjaDEgIT09IFwiIFwiKSB7XG4gICAgICByZXR1cm4gY2gxO1xuICAgIH0gZWxzZSB7XG4gICAgICByZXR1cm4gY2gyO1xuICAgIH1cbiAgfVxuXG4gIC8vIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG4gIC8vIG1haW4gdmVydGljYWwgc211c2ggcm91dGluZXMgKGV4Y2x1ZGluZyBydWxlcylcblxuICAvKlxuICAgICAgICB0eHQxIC0gQSBsaW5lIG9mIHRleHRcbiAgICAgICAgdHh0MiAtIEEgbGluZSBvZiB0ZXh0XG4gICAgICAgIG9wdHMgLSBGSUdsZXQgb3B0aW9ucyBhcnJheVxuXG4gICAgICAgIEFib3V0OiBUYWtlcyBpbiB0d28gbGluZXMgb2YgdGV4dCBhbmQgcmV0dXJucyBvbmUgb2YgdGhlIGZvbGxvd2luZzpcbiAgICAgICAgXCJ2YWxpZFwiIC0gVGhlc2UgbGluZXMgY2FuIGJlIHNtdXNoZWQgdG9nZXRoZXIgZ2l2ZW4gdGhlIGN1cnJlbnQgc211c2hpbmcgcnVsZXNcbiAgICAgICAgXCJlbmRcIiAtIFRoZSBsaW5lcyBjYW4gYmUgc211c2hlZCwgYnV0IHdlJ3JlIGF0IGEgc3RvcHBpbmcgcG9pbnRcbiAgICAgICAgXCJpbnZhbGlkXCIgLSBUaGUgdHdvIGxpbmVzIGNhbm5vdCBiZSBzbXVzaGVkIHRvZ2V0aGVyXG4gICAgKi9cbiAgZnVuY3Rpb24gY2FuVmVydGljYWxTbXVzaCh0eHQxLCB0eHQyLCBvcHRzKSB7XG4gICAgaWYgKG9wdHMuZml0dGluZ1J1bGVzLnZMYXlvdXQgPT09IEZVTExfV0lEVEgpIHtcbiAgICAgIHJldHVybiBcImludmFsaWRcIjtcbiAgICB9XG4gICAgbGV0IGlpLFxuICAgICAgbGVuID0gTWF0aC5taW4odHh0MS5sZW5ndGgsIHR4dDIubGVuZ3RoKSxcbiAgICAgIGNoMSxcbiAgICAgIGNoMixcbiAgICAgIGVuZFNtdXNoID0gZmFsc2UsXG4gICAgICB2YWxpZFNtdXNoO1xuICAgIGlmIChsZW4gPT09IDApIHtcbiAgICAgIHJldHVybiBcImludmFsaWRcIjtcbiAgICB9XG5cbiAgICBmb3IgKGlpID0gMDsgaWkgPCBsZW47IGlpKyspIHtcbiAgICAgIGNoMSA9IHR4dDEuc3Vic3RyaW5nKGlpLCBpaSArIDEpO1xuICAgICAgY2gyID0gdHh0Mi5zdWJzdHJpbmcoaWksIGlpICsgMSk7XG4gICAgICBpZiAoY2gxICE9PSBcIiBcIiAmJiBjaDIgIT09IFwiIFwiKSB7XG4gICAgICAgIGlmIChvcHRzLmZpdHRpbmdSdWxlcy52TGF5b3V0ID09PSBGSVRUSU5HKSB7XG4gICAgICAgICAgcmV0dXJuIFwiaW52YWxpZFwiO1xuICAgICAgICB9IGVsc2UgaWYgKG9wdHMuZml0dGluZ1J1bGVzLnZMYXlvdXQgPT09IFNNVVNISU5HKSB7XG4gICAgICAgICAgcmV0dXJuIFwiZW5kXCI7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgaWYgKHZSdWxlNV9TbXVzaChjaDEsIGNoMikpIHtcbiAgICAgICAgICAgIGVuZFNtdXNoID0gZW5kU211c2ggfHwgZmFsc2U7XG4gICAgICAgICAgICBjb250aW51ZTtcbiAgICAgICAgICB9IC8vIHJ1bGUgNSBhbGxvdyBmb3IgXCJzdXBlclwiIHNtdXNoaW5nLCBidXQgb25seSBpZiB3ZSdyZSBub3QgYWxyZWFkeSBlbmRpbmcgdGhpcyBzbXVzaFxuICAgICAgICAgIHZhbGlkU211c2ggPSBmYWxzZTtcbiAgICAgICAgICB2YWxpZFNtdXNoID0gb3B0cy5maXR0aW5nUnVsZXMudlJ1bGUxXG4gICAgICAgICAgICA/IHZSdWxlMV9TbXVzaChjaDEsIGNoMilcbiAgICAgICAgICAgIDogdmFsaWRTbXVzaDtcbiAgICAgICAgICB2YWxpZFNtdXNoID1cbiAgICAgICAgICAgICF2YWxpZFNtdXNoICYmIG9wdHMuZml0dGluZ1J1bGVzLnZSdWxlMlxuICAgICAgICAgICAgICA/IHZSdWxlMl9TbXVzaChjaDEsIGNoMilcbiAgICAgICAgICAgICAgOiB2YWxpZFNtdXNoO1xuICAgICAgICAgIHZhbGlkU211c2ggPVxuICAgICAgICAgICAgIXZhbGlkU211c2ggJiYgb3B0cy5maXR0aW5nUnVsZXMudlJ1bGUzXG4gICAgICAgICAgICAgID8gdlJ1bGUzX1NtdXNoKGNoMSwgY2gyKVxuICAgICAgICAgICAgICA6IHZhbGlkU211c2g7XG4gICAgICAgICAgdmFsaWRTbXVzaCA9XG4gICAgICAgICAgICAhdmFsaWRTbXVzaCAmJiBvcHRzLmZpdHRpbmdSdWxlcy52UnVsZTRcbiAgICAgICAgICAgICAgPyB2UnVsZTRfU211c2goY2gxLCBjaDIpXG4gICAgICAgICAgICAgIDogdmFsaWRTbXVzaDtcbiAgICAgICAgICBlbmRTbXVzaCA9IHRydWU7XG4gICAgICAgICAgaWYgKCF2YWxpZFNtdXNoKSB7XG4gICAgICAgICAgICByZXR1cm4gXCJpbnZhbGlkXCI7XG4gICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICB9XG4gICAgfVxuICAgIGlmIChlbmRTbXVzaCkge1xuICAgICAgcmV0dXJuIFwiZW5kXCI7XG4gICAgfSBlbHNlIHtcbiAgICAgIHJldHVybiBcInZhbGlkXCI7XG4gICAgfVxuICB9XG5cbiAgZnVuY3Rpb24gZ2V0VmVydGljYWxTbXVzaERpc3QobGluZXMxLCBsaW5lczIsIG9wdHMpIHtcbiAgICBsZXQgbWF4RGlzdCA9IGxpbmVzMS5sZW5ndGg7XG4gICAgbGV0IGxlbjEgPSBsaW5lczEubGVuZ3RoO1xuICAgIGxldCBsZW4yID0gbGluZXMyLmxlbmd0aDtcbiAgICBsZXQgc3ViTGluZXMxLCBzdWJMaW5lczIsIHNsZW47XG4gICAgbGV0IGN1ckRpc3QgPSAxO1xuICAgIGxldCBpaSwgcmV0LCByZXN1bHQ7XG4gICAgd2hpbGUgKGN1ckRpc3QgPD0gbWF4RGlzdCkge1xuICAgICAgc3ViTGluZXMxID0gbGluZXMxLnNsaWNlKE1hdGgubWF4KDAsIGxlbjEgLSBjdXJEaXN0KSwgbGVuMSk7XG4gICAgICBzdWJMaW5lczIgPSBsaW5lczIuc2xpY2UoMCwgTWF0aC5taW4obWF4RGlzdCwgY3VyRGlzdCkpO1xuXG4gICAgICBzbGVuID0gc3ViTGluZXMyLmxlbmd0aDsgLy9UT0RPOmNoZWNrIHRoaXNcbiAgICAgIHJlc3VsdCA9IFwiXCI7XG4gICAgICBmb3IgKGlpID0gMDsgaWkgPCBzbGVuOyBpaSsrKSB7XG4gICAgICAgIHJldCA9IGNhblZlcnRpY2FsU211c2goc3ViTGluZXMxW2lpXSwgc3ViTGluZXMyW2lpXSwgb3B0cyk7XG4gICAgICAgIGlmIChyZXQgPT09IFwiZW5kXCIpIHtcbiAgICAgICAgICByZXN1bHQgPSByZXQ7XG4gICAgICAgIH0gZWxzZSBpZiAocmV0ID09PSBcImludmFsaWRcIikge1xuICAgICAgICAgIHJlc3VsdCA9IHJldDtcbiAgICAgICAgICBicmVhaztcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICBpZiAocmVzdWx0ID09PSBcIlwiKSB7XG4gICAgICAgICAgICByZXN1bHQgPSBcInZhbGlkXCI7XG4gICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICB9XG5cbiAgICAgIGlmIChyZXN1bHQgPT09IFwiaW52YWxpZFwiKSB7XG4gICAgICAgIGN1ckRpc3QtLTtcbiAgICAgICAgYnJlYWs7XG4gICAgICB9XG4gICAgICBpZiAocmVzdWx0ID09PSBcImVuZFwiKSB7XG4gICAgICAgIGJyZWFrO1xuICAgICAgfVxuICAgICAgaWYgKHJlc3VsdCA9PT0gXCJ2YWxpZFwiKSB7XG4gICAgICAgIGN1ckRpc3QrKztcbiAgICAgIH1cbiAgICB9XG5cbiAgICByZXR1cm4gTWF0aC5taW4obWF4RGlzdCwgY3VyRGlzdCk7XG4gIH1cblxuICBmdW5jdGlvbiB2ZXJ0aWNhbGx5U211c2hMaW5lcyhsaW5lMSwgbGluZTIsIG9wdHMpIHtcbiAgICBsZXQgaWksXG4gICAgICBsZW4gPSBNYXRoLm1pbihsaW5lMS5sZW5ndGgsIGxpbmUyLmxlbmd0aCk7XG4gICAgbGV0IGNoMSxcbiAgICAgIGNoMixcbiAgICAgIHJlc3VsdCA9IFwiXCIsXG4gICAgICB2YWxpZFNtdXNoO1xuXG4gICAgZm9yIChpaSA9IDA7IGlpIDwgbGVuOyBpaSsrKSB7XG4gICAgICBjaDEgPSBsaW5lMS5zdWJzdHJpbmcoaWksIGlpICsgMSk7XG4gICAgICBjaDIgPSBsaW5lMi5zdWJzdHJpbmcoaWksIGlpICsgMSk7XG4gICAgICBpZiAoY2gxICE9PSBcIiBcIiAmJiBjaDIgIT09IFwiIFwiKSB7XG4gICAgICAgIGlmIChvcHRzLmZpdHRpbmdSdWxlcy52TGF5b3V0ID09PSBGSVRUSU5HKSB7XG4gICAgICAgICAgcmVzdWx0ICs9IHVuaV9TbXVzaChjaDEsIGNoMik7XG4gICAgICAgIH0gZWxzZSBpZiAob3B0cy5maXR0aW5nUnVsZXMudkxheW91dCA9PT0gU01VU0hJTkcpIHtcbiAgICAgICAgICByZXN1bHQgKz0gdW5pX1NtdXNoKGNoMSwgY2gyKTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICB2YWxpZFNtdXNoID0gZmFsc2U7XG4gICAgICAgICAgdmFsaWRTbXVzaCA9IG9wdHMuZml0dGluZ1J1bGVzLnZSdWxlNVxuICAgICAgICAgICAgPyB2UnVsZTVfU211c2goY2gxLCBjaDIpXG4gICAgICAgICAgICA6IHZhbGlkU211c2g7XG4gICAgICAgICAgdmFsaWRTbXVzaCA9XG4gICAgICAgICAgICAhdmFsaWRTbXVzaCAmJiBvcHRzLmZpdHRpbmdSdWxlcy52UnVsZTFcbiAgICAgICAgICAgICAgPyB2UnVsZTFfU211c2goY2gxLCBjaDIpXG4gICAgICAgICAgICAgIDogdmFsaWRTbXVzaDtcbiAgICAgICAgICB2YWxpZFNtdXNoID1cbiAgICAgICAgICAgICF2YWxpZFNtdXNoICYmIG9wdHMuZml0dGluZ1J1bGVzLnZSdWxlMlxuICAgICAgICAgICAgICA/IHZSdWxlMl9TbXVzaChjaDEsIGNoMilcbiAgICAgICAgICAgICAgOiB2YWxpZFNtdXNoO1xuICAgICAgICAgIHZhbGlkU211c2ggPVxuICAgICAgICAgICAgIXZhbGlkU211c2ggJiYgb3B0cy5maXR0aW5nUnVsZXMudlJ1bGUzXG4gICAgICAgICAgICAgID8gdlJ1bGUzX1NtdXNoKGNoMSwgY2gyKVxuICAgICAgICAgICAgICA6IHZhbGlkU211c2g7XG4gICAgICAgICAgdmFsaWRTbXVzaCA9XG4gICAgICAgICAgICAhdmFsaWRTbXVzaCAmJiBvcHRzLmZpdHRpbmdSdWxlcy52UnVsZTRcbiAgICAgICAgICAgICAgPyB2UnVsZTRfU211c2goY2gxLCBjaDIpXG4gICAgICAgICAgICAgIDogdmFsaWRTbXVzaDtcbiAgICAgICAgICByZXN1bHQgKz0gdmFsaWRTbXVzaDtcbiAgICAgICAgfVxuICAgICAgfSBlbHNlIHtcbiAgICAgICAgcmVzdWx0ICs9IHVuaV9TbXVzaChjaDEsIGNoMik7XG4gICAgICB9XG4gICAgfVxuICAgIHJldHVybiByZXN1bHQ7XG4gIH1cblxuICBmdW5jdGlvbiB2ZXJ0aWNhbFNtdXNoKGxpbmVzMSwgbGluZXMyLCBvdmVybGFwLCBvcHRzKSB7XG4gICAgbGV0IGxlbjEgPSBsaW5lczEubGVuZ3RoO1xuICAgIGxldCBsZW4yID0gbGluZXMyLmxlbmd0aDtcbiAgICBsZXQgcGllY2UxID0gbGluZXMxLnNsaWNlKDAsIE1hdGgubWF4KDAsIGxlbjEgLSBvdmVybGFwKSk7XG4gICAgbGV0IHBpZWNlMl8xID0gbGluZXMxLnNsaWNlKE1hdGgubWF4KDAsIGxlbjEgLSBvdmVybGFwKSwgbGVuMSk7XG4gICAgbGV0IHBpZWNlMl8yID0gbGluZXMyLnNsaWNlKDAsIE1hdGgubWluKG92ZXJsYXAsIGxlbjIpKTtcbiAgICBsZXQgaWksXG4gICAgICBsZW4sXG4gICAgICBsaW5lLFxuICAgICAgcGllY2UyID0gW10sXG4gICAgICBwaWVjZTMsXG4gICAgICByZXN1bHQgPSBbXTtcblxuICAgIGxlbiA9IHBpZWNlMl8xLmxlbmd0aDtcbiAgICBmb3IgKGlpID0gMDsgaWkgPCBsZW47IGlpKyspIHtcbiAgICAgIGlmIChpaSA+PSBsZW4yKSB7XG4gICAgICAgIGxpbmUgPSBwaWVjZTJfMVtpaV07XG4gICAgICB9IGVsc2Uge1xuICAgICAgICBsaW5lID0gdmVydGljYWxseVNtdXNoTGluZXMocGllY2UyXzFbaWldLCBwaWVjZTJfMltpaV0sIG9wdHMpO1xuICAgICAgfVxuICAgICAgcGllY2UyLnB1c2gobGluZSk7XG4gICAgfVxuXG4gICAgcGllY2UzID0gbGluZXMyLnNsaWNlKE1hdGgubWluKG92ZXJsYXAsIGxlbjIpLCBsZW4yKTtcblxuICAgIHJldHVybiByZXN1bHQuY29uY2F0KHBpZWNlMSwgcGllY2UyLCBwaWVjZTMpO1xuICB9XG5cbiAgZnVuY3Rpb24gcGFkTGluZXMobGluZXMsIG51bVNwYWNlcykge1xuICAgIGxldCBpaSxcbiAgICAgIGxlbiA9IGxpbmVzLmxlbmd0aCxcbiAgICAgIHBhZGRpbmcgPSBcIlwiO1xuICAgIGZvciAoaWkgPSAwOyBpaSA8IG51bVNwYWNlczsgaWkrKykge1xuICAgICAgcGFkZGluZyArPSBcIiBcIjtcbiAgICB9XG4gICAgZm9yIChpaSA9IDA7IGlpIDwgbGVuOyBpaSsrKSB7XG4gICAgICBsaW5lc1tpaV0gKz0gcGFkZGluZztcbiAgICB9XG4gIH1cblxuICBmdW5jdGlvbiBzbXVzaFZlcnRpY2FsRmlnTGluZXMob3V0cHV0LCBsaW5lcywgb3B0cykge1xuICAgIGxldCBsZW4xID0gb3V0cHV0WzBdLmxlbmd0aDtcbiAgICBsZXQgbGVuMiA9IGxpbmVzWzBdLmxlbmd0aDtcbiAgICBsZXQgb3ZlcmxhcDtcbiAgICBpZiAobGVuMSA+IGxlbjIpIHtcbiAgICAgIHBhZExpbmVzKGxpbmVzLCBsZW4xIC0gbGVuMik7XG4gICAgfSBlbHNlIGlmIChsZW4yID4gbGVuMSkge1xuICAgICAgcGFkTGluZXMob3V0cHV0LCBsZW4yIC0gbGVuMSk7XG4gICAgfVxuICAgIG92ZXJsYXAgPSBnZXRWZXJ0aWNhbFNtdXNoRGlzdChvdXRwdXQsIGxpbmVzLCBvcHRzKTtcbiAgICByZXR1cm4gdmVydGljYWxTbXVzaChvdXRwdXQsIGxpbmVzLCBvdmVybGFwLCBvcHRzKTtcbiAgfVxuXG4gIC8vIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cbiAgLy8gTWFpbiBob3Jpem9udGFsIHNtdXNoIHJvdXRpbmVzIChleGNsdWRpbmcgcnVsZXMpXG5cbiAgZnVuY3Rpb24gZ2V0SG9yaXpvbnRhbFNtdXNoTGVuZ3RoKHR4dDEsIHR4dDIsIG9wdHMpIHtcbiAgICBpZiAob3B0cy5maXR0aW5nUnVsZXMuaExheW91dCA9PT0gRlVMTF9XSURUSCkge1xuICAgICAgcmV0dXJuIDA7XG4gICAgfVxuICAgIGxldCBpaSxcbiAgICAgIGxlbjEgPSB0eHQxLmxlbmd0aCxcbiAgICAgIGxlbjIgPSB0eHQyLmxlbmd0aDtcbiAgICBsZXQgbWF4RGlzdCA9IGxlbjE7XG4gICAgbGV0IGN1ckRpc3QgPSAxO1xuICAgIGxldCBicmVha0FmdGVyID0gZmFsc2U7XG4gICAgbGV0IHZhbGlkU211c2ggPSBmYWxzZTtcbiAgICBsZXQgc2VnMSwgc2VnMiwgY2gxLCBjaDI7XG4gICAgaWYgKGxlbjEgPT09IDApIHtcbiAgICAgIHJldHVybiAwO1xuICAgIH1cblxuICAgIGRpc3RDYWw6IHdoaWxlIChjdXJEaXN0IDw9IG1heERpc3QpIHtcbiAgICAgIGNvbnN0IHNlZzFTdGFydFBvcyA9IGxlbjEgLSBjdXJEaXN0O1xuICAgICAgc2VnMSA9IHR4dDEuc3Vic3RyaW5nKHNlZzFTdGFydFBvcywgc2VnMVN0YXJ0UG9zICsgY3VyRGlzdCk7XG4gICAgICBzZWcyID0gdHh0Mi5zdWJzdHJpbmcoMCwgTWF0aC5taW4oY3VyRGlzdCwgbGVuMikpO1xuICAgICAgZm9yIChpaSA9IDA7IGlpIDwgTWF0aC5taW4oY3VyRGlzdCwgbGVuMik7IGlpKyspIHtcbiAgICAgICAgY2gxID0gc2VnMS5zdWJzdHJpbmcoaWksIGlpICsgMSk7XG4gICAgICAgIGNoMiA9IHNlZzIuc3Vic3RyaW5nKGlpLCBpaSArIDEpO1xuICAgICAgICBpZiAoY2gxICE9PSBcIiBcIiAmJiBjaDIgIT09IFwiIFwiKSB7XG4gICAgICAgICAgaWYgKG9wdHMuZml0dGluZ1J1bGVzLmhMYXlvdXQgPT09IEZJVFRJTkcpIHtcbiAgICAgICAgICAgIGN1ckRpc3QgPSBjdXJEaXN0IC0gMTtcbiAgICAgICAgICAgIGJyZWFrIGRpc3RDYWw7XG4gICAgICAgICAgfSBlbHNlIGlmIChvcHRzLmZpdHRpbmdSdWxlcy5oTGF5b3V0ID09PSBTTVVTSElORykge1xuICAgICAgICAgICAgaWYgKGNoMSA9PT0gb3B0cy5oYXJkQmxhbmsgfHwgY2gyID09PSBvcHRzLmhhcmRCbGFuaykge1xuICAgICAgICAgICAgICBjdXJEaXN0ID0gY3VyRGlzdCAtIDE7IC8vIHVuaXZlcnNhbCBzbXVzaGluZyBkb2VzIG5vdCBzbXVzaCBoYXJkYmxhbmtzXG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBicmVhayBkaXN0Q2FsO1xuICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBicmVha0FmdGVyID0gdHJ1ZTsgLy8gd2Uga25vdyB3ZSBuZWVkIHRvIGJyZWFrLCBidXQgd2UgbmVlZCB0byBjaGVjayBpZiBvdXIgc211c2hpbmcgcnVsZXMgd2lsbCBhbGxvdyB1cyB0byBzbXVzaCB0aGUgb3ZlcmxhcHBlZCBjaGFyYWN0ZXJzXG4gICAgICAgICAgICB2YWxpZFNtdXNoID0gZmFsc2U7IC8vIHRoZSBiZWxvdyBjaGVja3Mgd2lsbCBsZXQgdXMga25vdyBpZiB3ZSBjYW4gc211c2ggdGhlc2UgY2hhcmFjdGVyc1xuXG4gICAgICAgICAgICB2YWxpZFNtdXNoID0gb3B0cy5maXR0aW5nUnVsZXMuaFJ1bGUxXG4gICAgICAgICAgICAgID8gaFJ1bGUxX1NtdXNoKGNoMSwgY2gyLCBvcHRzLmhhcmRCbGFuaylcbiAgICAgICAgICAgICAgOiB2YWxpZFNtdXNoO1xuICAgICAgICAgICAgdmFsaWRTbXVzaCA9XG4gICAgICAgICAgICAgICF2YWxpZFNtdXNoICYmIG9wdHMuZml0dGluZ1J1bGVzLmhSdWxlMlxuICAgICAgICAgICAgICAgID8gaFJ1bGUyX1NtdXNoKGNoMSwgY2gyLCBvcHRzLmhhcmRCbGFuaylcbiAgICAgICAgICAgICAgICA6IHZhbGlkU211c2g7XG4gICAgICAgICAgICB2YWxpZFNtdXNoID1cbiAgICAgICAgICAgICAgIXZhbGlkU211c2ggJiYgb3B0cy5maXR0aW5nUnVsZXMuaFJ1bGUzXG4gICAgICAgICAgICAgICAgPyBoUnVsZTNfU211c2goY2gxLCBjaDIsIG9wdHMuaGFyZEJsYW5rKVxuICAgICAgICAgICAgICAgIDogdmFsaWRTbXVzaDtcbiAgICAgICAgICAgIHZhbGlkU211c2ggPVxuICAgICAgICAgICAgICAhdmFsaWRTbXVzaCAmJiBvcHRzLmZpdHRpbmdSdWxlcy5oUnVsZTRcbiAgICAgICAgICAgICAgICA/IGhSdWxlNF9TbXVzaChjaDEsIGNoMiwgb3B0cy5oYXJkQmxhbmspXG4gICAgICAgICAgICAgICAgOiB2YWxpZFNtdXNoO1xuICAgICAgICAgICAgdmFsaWRTbXVzaCA9XG4gICAgICAgICAgICAgICF2YWxpZFNtdXNoICYmIG9wdHMuZml0dGluZ1J1bGVzLmhSdWxlNVxuICAgICAgICAgICAgICAgID8gaFJ1bGU1X1NtdXNoKGNoMSwgY2gyLCBvcHRzLmhhcmRCbGFuaylcbiAgICAgICAgICAgICAgICA6IHZhbGlkU211c2g7XG4gICAgICAgICAgICB2YWxpZFNtdXNoID1cbiAgICAgICAgICAgICAgIXZhbGlkU211c2ggJiYgb3B0cy5maXR0aW5nUnVsZXMuaFJ1bGU2XG4gICAgICAgICAgICAgICAgPyBoUnVsZTZfU211c2goY2gxLCBjaDIsIG9wdHMuaGFyZEJsYW5rKVxuICAgICAgICAgICAgICAgIDogdmFsaWRTbXVzaDtcblxuICAgICAgICAgICAgaWYgKCF2YWxpZFNtdXNoKSB7XG4gICAgICAgICAgICAgIGN1ckRpc3QgPSBjdXJEaXN0IC0gMTtcbiAgICAgICAgICAgICAgYnJlYWsgZGlzdENhbDtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICAgIGlmIChicmVha0FmdGVyKSB7XG4gICAgICAgIGJyZWFrO1xuICAgICAgfVxuICAgICAgY3VyRGlzdCsrO1xuICAgIH1cbiAgICByZXR1cm4gTWF0aC5taW4obWF4RGlzdCwgY3VyRGlzdCk7XG4gIH1cblxuICBmdW5jdGlvbiBob3Jpem9udGFsU211c2godGV4dEJsb2NrMSwgdGV4dEJsb2NrMiwgb3ZlcmxhcCwgb3B0cykge1xuICAgIGxldCBpaSxcbiAgICAgIGpqLFxuICAgICAgb3V0cHV0RmlnID0gW10sXG4gICAgICBvdmVybGFwU3RhcnQsXG4gICAgICBwaWVjZTEsXG4gICAgICBwaWVjZTIsXG4gICAgICBwaWVjZTMsXG4gICAgICBsZW4xLFxuICAgICAgbGVuMixcbiAgICAgIHR4dDEsXG4gICAgICB0eHQyO1xuXG4gICAgZm9yIChpaSA9IDA7IGlpIDwgb3B0cy5oZWlnaHQ7IGlpKyspIHtcbiAgICAgIHR4dDEgPSB0ZXh0QmxvY2sxW2lpXTtcbiAgICAgIHR4dDIgPSB0ZXh0QmxvY2syW2lpXTtcbiAgICAgIGxlbjEgPSB0eHQxLmxlbmd0aDtcbiAgICAgIGxlbjIgPSB0eHQyLmxlbmd0aDtcbiAgICAgIG92ZXJsYXBTdGFydCA9IGxlbjEgLSBvdmVybGFwO1xuICAgICAgcGllY2UxID0gdHh0MS5zdWJzdHIoMCwgTWF0aC5tYXgoMCwgb3ZlcmxhcFN0YXJ0KSk7XG4gICAgICBwaWVjZTIgPSBcIlwiO1xuXG4gICAgICAvLyBkZXRlcm1pbmUgb3ZlcmxhcCBwaWVjZVxuICAgICAgY29uc3Qgc2VnMVN0YXJ0UG9zID0gTWF0aC5tYXgoMCwgbGVuMSAtIG92ZXJsYXApO1xuICAgICAgdmFyIHNlZzEgPSB0eHQxLnN1YnN0cmluZyhzZWcxU3RhcnRQb3MsIHNlZzFTdGFydFBvcyArIG92ZXJsYXApO1xuICAgICAgdmFyIHNlZzIgPSB0eHQyLnN1YnN0cmluZygwLCBNYXRoLm1pbihvdmVybGFwLCBsZW4yKSk7XG5cbiAgICAgIGZvciAoamogPSAwOyBqaiA8IG92ZXJsYXA7IGpqKyspIHtcbiAgICAgICAgdmFyIGNoMSA9IGpqIDwgbGVuMSA/IHNlZzEuc3Vic3RyaW5nKGpqLCBqaiArIDEpIDogXCIgXCI7XG4gICAgICAgIHZhciBjaDIgPSBqaiA8IGxlbjIgPyBzZWcyLnN1YnN0cmluZyhqaiwgamogKyAxKSA6IFwiIFwiO1xuXG4gICAgICAgIGlmIChjaDEgIT09IFwiIFwiICYmIGNoMiAhPT0gXCIgXCIpIHtcbiAgICAgICAgICBpZiAob3B0cy5maXR0aW5nUnVsZXMuaExheW91dCA9PT0gRklUVElORykge1xuICAgICAgICAgICAgcGllY2UyICs9IHVuaV9TbXVzaChjaDEsIGNoMiwgb3B0cy5oYXJkQmxhbmspO1xuICAgICAgICAgIH0gZWxzZSBpZiAob3B0cy5maXR0aW5nUnVsZXMuaExheW91dCA9PT0gU01VU0hJTkcpIHtcbiAgICAgICAgICAgIHBpZWNlMiArPSB1bmlfU211c2goY2gxLCBjaDIsIG9wdHMuaGFyZEJsYW5rKTtcbiAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgLy8gQ29udHJvbGxlZCBTbXVzaGluZ1xuICAgICAgICAgICAgdmFyIG5leHRDaCA9IFwiXCI7XG4gICAgICAgICAgICBuZXh0Q2ggPVxuICAgICAgICAgICAgICAhbmV4dENoICYmIG9wdHMuZml0dGluZ1J1bGVzLmhSdWxlMVxuICAgICAgICAgICAgICAgID8gaFJ1bGUxX1NtdXNoKGNoMSwgY2gyLCBvcHRzLmhhcmRCbGFuaylcbiAgICAgICAgICAgICAgICA6IG5leHRDaDtcbiAgICAgICAgICAgIG5leHRDaCA9XG4gICAgICAgICAgICAgICFuZXh0Q2ggJiYgb3B0cy5maXR0aW5nUnVsZXMuaFJ1bGUyXG4gICAgICAgICAgICAgICAgPyBoUnVsZTJfU211c2goY2gxLCBjaDIsIG9wdHMuaGFyZEJsYW5rKVxuICAgICAgICAgICAgICAgIDogbmV4dENoO1xuICAgICAgICAgICAgbmV4dENoID1cbiAgICAgICAgICAgICAgIW5leHRDaCAmJiBvcHRzLmZpdHRpbmdSdWxlcy5oUnVsZTNcbiAgICAgICAgICAgICAgICA/IGhSdWxlM19TbXVzaChjaDEsIGNoMiwgb3B0cy5oYXJkQmxhbmspXG4gICAgICAgICAgICAgICAgOiBuZXh0Q2g7XG4gICAgICAgICAgICBuZXh0Q2ggPVxuICAgICAgICAgICAgICAhbmV4dENoICYmIG9wdHMuZml0dGluZ1J1bGVzLmhSdWxlNFxuICAgICAgICAgICAgICAgID8gaFJ1bGU0X1NtdXNoKGNoMSwgY2gyLCBvcHRzLmhhcmRCbGFuaylcbiAgICAgICAgICAgICAgICA6IG5leHRDaDtcbiAgICAgICAgICAgIG5leHRDaCA9XG4gICAgICAgICAgICAgICFuZXh0Q2ggJiYgb3B0cy5maXR0aW5nUnVsZXMuaFJ1bGU1XG4gICAgICAgICAgICAgICAgPyBoUnVsZTVfU211c2goY2gxLCBjaDIsIG9wdHMuaGFyZEJsYW5rKVxuICAgICAgICAgICAgICAgIDogbmV4dENoO1xuICAgICAgICAgICAgbmV4dENoID1cbiAgICAgICAgICAgICAgIW5leHRDaCAmJiBvcHRzLmZpdHRpbmdSdWxlcy5oUnVsZTZcbiAgICAgICAgICAgICAgICA/IGhSdWxlNl9TbXVzaChjaDEsIGNoMiwgb3B0cy5oYXJkQmxhbmspXG4gICAgICAgICAgICAgICAgOiBuZXh0Q2g7XG4gICAgICAgICAgICBuZXh0Q2ggPSBuZXh0Q2ggfHwgdW5pX1NtdXNoKGNoMSwgY2gyLCBvcHRzLmhhcmRCbGFuayk7XG4gICAgICAgICAgICBwaWVjZTIgKz0gbmV4dENoO1xuICAgICAgICAgIH1cbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICBwaWVjZTIgKz0gdW5pX1NtdXNoKGNoMSwgY2gyLCBvcHRzLmhhcmRCbGFuayk7XG4gICAgICAgIH1cbiAgICAgIH1cblxuICAgICAgaWYgKG92ZXJsYXAgPj0gbGVuMikge1xuICAgICAgICBwaWVjZTMgPSBcIlwiO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgcGllY2UzID0gdHh0Mi5zdWJzdHJpbmcob3ZlcmxhcCwgb3ZlcmxhcCArIE1hdGgubWF4KDAsIGxlbjIgLSBvdmVybGFwKSk7XG4gICAgICB9XG4gICAgICBvdXRwdXRGaWdbaWldID0gcGllY2UxICsgcGllY2UyICsgcGllY2UzO1xuICAgIH1cbiAgICByZXR1cm4gb3V0cHV0RmlnO1xuICB9XG5cbiAgLypcbiAgICAgICAgQ3JlYXRlcyBuZXcgZW1wdHkgQVNDSUkgcGxhY2Vob2xkZXIgb2YgZ2l2ZSBsZW5cbiAgICAgICAgLSBsZW4gLSBudW1iZXJcbiAgICAqL1xuICBmdW5jdGlvbiBuZXdGaWdDaGFyKGxlbikge1xuICAgIGxldCBvdXRwdXRGaWdUZXh0ID0gW10sXG4gICAgICByb3c7XG4gICAgZm9yIChyb3cgPSAwOyByb3cgPCBsZW47IHJvdysrKSB7XG4gICAgICBvdXRwdXRGaWdUZXh0W3Jvd10gPSBcIlwiO1xuICAgIH1cbiAgICByZXR1cm4gb3V0cHV0RmlnVGV4dDtcbiAgfVxuXG4gIC8qXG4gICAgICAgIFJldHVybiBtYXggbGluZSBvZiB0aGUgQVNDSUkgQXJ0XG4gICAgICAgIC0gdGV4dCBpcyBhcnJheSBvZiBsaW5lcyBmb3IgdGV4dFxuICAgICAgICAtIGNoYXIgaXMgbmV4dCBjaGFyYWN0ZXJcbiAgICAgKi9cbiAgY29uc3QgZmlnTGluZXNXaWR0aCA9IGZ1bmN0aW9uICh0ZXh0TGluZXMpIHtcbiAgICByZXR1cm4gTWF0aC5tYXguYXBwbHkoXG4gICAgICBNYXRoLFxuICAgICAgdGV4dExpbmVzLm1hcChmdW5jdGlvbiAobGluZSwgaSkge1xuICAgICAgICByZXR1cm4gbGluZS5sZW5ndGg7XG4gICAgICB9KVxuICAgICk7XG4gIH07XG5cbiAgLypcbiAgICAgICBqb2luIHdvcmRzIG9yIHNpbmdsZSBjaGFyYWNhdGVycyBpbnRvIHNpbmdsZSBGaWcgbGluZVxuICAgICAgIC0gYXJyYXkgLSBhcnJheSBvZiBBU0NJSSB3b3JkcyBvciBzaW5nbGUgY2hhcmFjdGVyczoge2ZpZzogYXJyYXksIG92ZXJsYXA6IG51bWJlcn1cbiAgICAgICAtIGxlbiAtIGhlaWdodCBvZiB0aGUgQ2hhcmFjdGVycyAobnVtYmVyIG9mIHJvd3MpXG4gICAgICAgLSBvcHQgLSBvcHRpb25zIG9iamVjdFxuICAgICovXG4gIGZ1bmN0aW9uIGpvaW5GaWdBcnJheShhcnJheSwgbGVuLCBvcHRzKSB7XG4gICAgcmV0dXJuIGFycmF5LnJlZHVjZShmdW5jdGlvbiAoYWNjLCBkYXRhKSB7XG4gICAgICByZXR1cm4gaG9yaXpvbnRhbFNtdXNoKGFjYywgZGF0YS5maWcsIGRhdGEub3ZlcmxhcCwgb3B0cyk7XG4gICAgfSwgbmV3RmlnQ2hhcihsZW4pKTtcbiAgfVxuXG4gIC8qXG4gICAgICAgYnJlYWsgbG9uZyB3b3JkIHJldHVybiBsZWZ0b3ZlciBjaGFyYWN0ZXJzIGFuZCBsaW5lIGJlZm9yZSB0aGUgYnJlYWtcbiAgICAgICAtIGZpZ0NoYXJzIC0gbGlzdCBvZiBzaW5nbGUgQVNDSUkgY2hhcmFjdGVycyBpbiBmb3JtIHtmaWcsIG92ZXJsYXB9XG4gICAgICAgLSBsZW4gLSBudW1iZXIgb2Ygcm93c1xuICAgICAgIC0gb3B0IC0gb3B0aW9ucyBvYmplY3RcbiAgICAqL1xuICBmdW5jdGlvbiBicmVha1dvcmQoZmlnQ2hhcnMsIGxlbiwgb3B0cykge1xuICAgIGNvbnN0IHJlc3VsdCA9IHt9O1xuICAgIGZvciAobGV0IGkgPSBmaWdDaGFycy5sZW5ndGg7IC0taTsgKSB7XG4gICAgICBsZXQgdyA9IGpvaW5GaWdBcnJheShmaWdDaGFycy5zbGljZSgwLCBpKSwgbGVuLCBvcHRzKTtcbiAgICAgIGlmIChmaWdMaW5lc1dpZHRoKHcpIDw9IG9wdHMud2lkdGgpIHtcbiAgICAgICAgcmVzdWx0Lm91dHB1dEZpZ1RleHQgPSB3O1xuICAgICAgICBpZiAoaSA8IGZpZ0NoYXJzLmxlbmd0aCkge1xuICAgICAgICAgIHJlc3VsdC5jaGFycyA9IGZpZ0NoYXJzLnNsaWNlKGkpO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIHJlc3VsdC5jaGFycyA9IFtdO1xuICAgICAgICB9XG4gICAgICAgIGJyZWFrO1xuICAgICAgfVxuICAgIH1cbiAgICByZXR1cm4gcmVzdWx0O1xuICB9XG5cbiAgZnVuY3Rpb24gZ2VuZXJhdGVGaWdUZXh0TGluZXModHh0LCBmaWdDaGFycywgb3B0cykge1xuICAgIGxldCBjaGFySW5kZXgsXG4gICAgICBmaWdDaGFyLFxuICAgICAgb3ZlcmxhcCA9IDAsXG4gICAgICByb3csXG4gICAgICBvdXRwdXRGaWdUZXh0LFxuICAgICAgbGVuLFxuICAgICAgaGVpZ2h0ID0gb3B0cy5oZWlnaHQsXG4gICAgICBvdXRwdXRGaWdMaW5lcyA9IFtdLFxuICAgICAgbWF4V2lkdGgsXG4gICAgICBuZXh0RmlnQ2hhcnMsXG4gICAgICBmaWdXb3JkcyA9IFtdLFxuICAgICAgY2hhcixcbiAgICAgIGlzU3BhY2UsXG4gICAgICB0ZXh0RmlnV29yZCxcbiAgICAgIHRleHRGaWdMaW5lLFxuICAgICAgdG1wQnJlYWs7XG5cbiAgICBvdXRwdXRGaWdUZXh0ID0gbmV3RmlnQ2hhcihoZWlnaHQpO1xuICAgIGlmIChvcHRzLndpZHRoID4gMCAmJiBvcHRzLndoaXRlc3BhY2VCcmVhaykge1xuICAgICAgLy8gbGlzdCBvZiBjaGFyYWN0ZXJzIGlzIHVzZWQgdG8gYnJlYWsgaW4gdGhlIG1pZGRsZSBvZiB0aGUgd29yZCB3aGVuIHdvcmQgaXMgbG9nbmVyXG4gICAgICAvLyBjaGFycyBpcyBhcnJheSBvZiBjaGFyYWN0ZXJzIHdpdGgge2ZpZywgb3ZlcmxhcH0gYW5kIG92ZXJsYXAgaXMgZm9yIHdob2xlIHdvcmRcbiAgICAgIG5leHRGaWdDaGFycyA9IHtcbiAgICAgICAgY2hhcnM6IFtdLFxuICAgICAgICBvdmVybGFwOiBvdmVybGFwLFxuICAgICAgfTtcbiAgICB9XG4gICAgaWYgKG9wdHMucHJpbnREaXJlY3Rpb24gPT09IDEpIHtcbiAgICAgIHR4dCA9IHR4dC5zcGxpdChcIlwiKS5yZXZlcnNlKCkuam9pbihcIlwiKTtcbiAgICB9XG4gICAgbGVuID0gdHh0Lmxlbmd0aDtcbiAgICBmb3IgKGNoYXJJbmRleCA9IDA7IGNoYXJJbmRleCA8IGxlbjsgY2hhckluZGV4KyspIHtcbiAgICAgIGNoYXIgPSB0eHQuc3Vic3RyaW5nKGNoYXJJbmRleCwgY2hhckluZGV4ICsgMSk7XG4gICAgICBpc1NwYWNlID0gY2hhci5tYXRjaCgvXFxzLyk7XG4gICAgICBmaWdDaGFyID0gZmlnQ2hhcnNbY2hhci5jaGFyQ29kZUF0KDApXTtcbiAgICAgIHRleHRGaWdMaW5lID0gbnVsbDtcbiAgICAgIGlmIChmaWdDaGFyKSB7XG4gICAgICAgIGlmIChvcHRzLmZpdHRpbmdSdWxlcy5oTGF5b3V0ICE9PSBGVUxMX1dJRFRIKSB7XG4gICAgICAgICAgb3ZlcmxhcCA9IDEwMDAwOyAvLyBhIHZhbHVlIHRvbyBoaWdoIHRvIGJlIHRoZSBvdmVybGFwXG4gICAgICAgICAgZm9yIChyb3cgPSAwOyByb3cgPCBvcHRzLmhlaWdodDsgcm93KyspIHtcbiAgICAgICAgICAgIG92ZXJsYXAgPSBNYXRoLm1pbihcbiAgICAgICAgICAgICAgb3ZlcmxhcCxcbiAgICAgICAgICAgICAgZ2V0SG9yaXpvbnRhbFNtdXNoTGVuZ3RoKG91dHB1dEZpZ1RleHRbcm93XSwgZmlnQ2hhcltyb3ddLCBvcHRzKVxuICAgICAgICAgICAgKTtcbiAgICAgICAgICB9XG4gICAgICAgICAgb3ZlcmxhcCA9IG92ZXJsYXAgPT09IDEwMDAwID8gMCA6IG92ZXJsYXA7XG4gICAgICAgIH1cbiAgICAgICAgaWYgKG9wdHMud2lkdGggPiAwKSB7XG4gICAgICAgICAgaWYgKG9wdHMud2hpdGVzcGFjZUJyZWFrKSB7XG4gICAgICAgICAgICAvLyBuZXh0IGNoYXJhY3RlciBpbiBsYXN0IHdvcmQgKGZpZ0NoYXJzIGhhdmUgc2FtZSBkYXRhIGFzIHdvcmRzKVxuICAgICAgICAgICAgdGV4dEZpZ1dvcmQgPSBqb2luRmlnQXJyYXkoXG4gICAgICAgICAgICAgIG5leHRGaWdDaGFycy5jaGFycy5jb25jYXQoW1xuICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgIGZpZzogZmlnQ2hhcixcbiAgICAgICAgICAgICAgICAgIG92ZXJsYXA6IG92ZXJsYXAsXG4gICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgXSksXG4gICAgICAgICAgICAgIGhlaWdodCxcbiAgICAgICAgICAgICAgb3B0c1xuICAgICAgICAgICAgKTtcbiAgICAgICAgICAgIHRleHRGaWdMaW5lID0gam9pbkZpZ0FycmF5KFxuICAgICAgICAgICAgICBmaWdXb3Jkcy5jb25jYXQoW1xuICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgIGZpZzogdGV4dEZpZ1dvcmQsXG4gICAgICAgICAgICAgICAgICBvdmVybGFwOiBuZXh0RmlnQ2hhcnMub3ZlcmxhcCxcbiAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICBdKSxcbiAgICAgICAgICAgICAgaGVpZ2h0LFxuICAgICAgICAgICAgICBvcHRzXG4gICAgICAgICAgICApO1xuICAgICAgICAgICAgbWF4V2lkdGggPSBmaWdMaW5lc1dpZHRoKHRleHRGaWdMaW5lKTtcbiAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgdGV4dEZpZ0xpbmUgPSBob3Jpem9udGFsU211c2goXG4gICAgICAgICAgICAgIG91dHB1dEZpZ1RleHQsXG4gICAgICAgICAgICAgIGZpZ0NoYXIsXG4gICAgICAgICAgICAgIG92ZXJsYXAsXG4gICAgICAgICAgICAgIG9wdHNcbiAgICAgICAgICAgICk7XG4gICAgICAgICAgICBtYXhXaWR0aCA9IGZpZ0xpbmVzV2lkdGgodGV4dEZpZ0xpbmUpO1xuICAgICAgICAgIH1cbiAgICAgICAgICBpZiAobWF4V2lkdGggPj0gb3B0cy53aWR0aCAmJiBjaGFySW5kZXggPiAwKSB7XG4gICAgICAgICAgICBpZiAob3B0cy53aGl0ZXNwYWNlQnJlYWspIHtcbiAgICAgICAgICAgICAgb3V0cHV0RmlnVGV4dCA9IGpvaW5GaWdBcnJheShmaWdXb3Jkcy5zbGljZSgwLCAtMSksIGhlaWdodCwgb3B0cyk7XG4gICAgICAgICAgICAgIGlmIChmaWdXb3Jkcy5sZW5ndGggPiAxKSB7XG4gICAgICAgICAgICAgICAgb3V0cHV0RmlnTGluZXMucHVzaChvdXRwdXRGaWdUZXh0KTtcbiAgICAgICAgICAgICAgICBvdXRwdXRGaWdUZXh0ID0gbmV3RmlnQ2hhcihoZWlnaHQpO1xuICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgIGZpZ1dvcmRzID0gW107XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICBvdXRwdXRGaWdMaW5lcy5wdXNoKG91dHB1dEZpZ1RleHQpO1xuICAgICAgICAgICAgICBvdXRwdXRGaWdUZXh0ID0gbmV3RmlnQ2hhcihoZWlnaHQpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICBpZiAob3B0cy53aWR0aCA+IDAgJiYgb3B0cy53aGl0ZXNwYWNlQnJlYWspIHtcbiAgICAgICAgICBpZiAoIWlzU3BhY2UgfHwgY2hhckluZGV4ID09PSBsZW4gLSAxKSB7XG4gICAgICAgICAgICBuZXh0RmlnQ2hhcnMuY2hhcnMucHVzaCh7IGZpZzogZmlnQ2hhciwgb3ZlcmxhcDogb3ZlcmxhcCB9KTtcbiAgICAgICAgICB9XG4gICAgICAgICAgaWYgKGlzU3BhY2UgfHwgY2hhckluZGV4ID09PSBsZW4gLSAxKSB7XG4gICAgICAgICAgICAvLyBicmVhayBsb25nIHdvcmRzXG4gICAgICAgICAgICB0bXBCcmVhayA9IG51bGw7XG4gICAgICAgICAgICB3aGlsZSAodHJ1ZSkge1xuICAgICAgICAgICAgICB0ZXh0RmlnTGluZSA9IGpvaW5GaWdBcnJheShuZXh0RmlnQ2hhcnMuY2hhcnMsIGhlaWdodCwgb3B0cyk7XG4gICAgICAgICAgICAgIG1heFdpZHRoID0gZmlnTGluZXNXaWR0aCh0ZXh0RmlnTGluZSk7XG4gICAgICAgICAgICAgIGlmIChtYXhXaWR0aCA+PSBvcHRzLndpZHRoKSB7XG4gICAgICAgICAgICAgICAgdG1wQnJlYWsgPSBicmVha1dvcmQobmV4dEZpZ0NoYXJzLmNoYXJzLCBoZWlnaHQsIG9wdHMpO1xuICAgICAgICAgICAgICAgIG5leHRGaWdDaGFycyA9IHsgY2hhcnM6IHRtcEJyZWFrLmNoYXJzIH07XG4gICAgICAgICAgICAgICAgb3V0cHV0RmlnTGluZXMucHVzaCh0bXBCcmVhay5vdXRwdXRGaWdUZXh0KTtcbiAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICAgICAgLy8gYW55IGxlZnRvdmVyc1xuICAgICAgICAgICAgaWYgKG1heFdpZHRoID4gMCkge1xuICAgICAgICAgICAgICBpZiAodG1wQnJlYWspIHtcbiAgICAgICAgICAgICAgICBmaWdXb3Jkcy5wdXNoKHsgZmlnOiB0ZXh0RmlnTGluZSwgb3ZlcmxhcDogMSB9KTtcbiAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICBmaWdXb3Jkcy5wdXNoKHtcbiAgICAgICAgICAgICAgICAgIGZpZzogdGV4dEZpZ0xpbmUsXG4gICAgICAgICAgICAgICAgICBvdmVybGFwOiBuZXh0RmlnQ2hhcnMub3ZlcmxhcCxcbiAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICAgICAgLy8gc2F2ZSBzcGFjZSBjaGFyYWN0ZXIgYW5kIGN1cnJlbnQgb3ZlcmxhcCBmb3Igc211c2ggaW4gam9pbkZpZ1dvcmRzXG4gICAgICAgICAgICBpZiAoaXNTcGFjZSkge1xuICAgICAgICAgICAgICBmaWdXb3Jkcy5wdXNoKHsgZmlnOiBmaWdDaGFyLCBvdmVybGFwOiBvdmVybGFwIH0pO1xuICAgICAgICAgICAgICBvdXRwdXRGaWdUZXh0ID0gbmV3RmlnQ2hhcihoZWlnaHQpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgaWYgKGNoYXJJbmRleCA9PT0gbGVuIC0gMSkge1xuICAgICAgICAgICAgICAvLyBsYXN0IGxpbmVcbiAgICAgICAgICAgICAgb3V0cHV0RmlnVGV4dCA9IGpvaW5GaWdBcnJheShmaWdXb3JkcywgaGVpZ2h0LCBvcHRzKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIG5leHRGaWdDaGFycyA9IHtcbiAgICAgICAgICAgICAgY2hhcnM6IFtdLFxuICAgICAgICAgICAgICBvdmVybGFwOiBvdmVybGFwLFxuICAgICAgICAgICAgfTtcbiAgICAgICAgICAgIGNvbnRpbnVlO1xuICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICBvdXRwdXRGaWdUZXh0ID0gaG9yaXpvbnRhbFNtdXNoKG91dHB1dEZpZ1RleHQsIGZpZ0NoYXIsIG92ZXJsYXAsIG9wdHMpO1xuICAgICAgfVxuICAgIH1cbiAgICAvLyBzcGVjaWFsIGNhc2Ugd2hlbiBsYXN0IGxpbmUgd291bGQgYmUgZW1wdHlcbiAgICAvLyB0aGlzIG1heSBoYXBwZW4gaWYgdGV4dCBmaXQgZXhhY3RseSBvcHQud2lkdGhcbiAgICBpZiAoZmlnTGluZXNXaWR0aChvdXRwdXRGaWdUZXh0KSA+IDApIHtcbiAgICAgIG91dHB1dEZpZ0xpbmVzLnB1c2gob3V0cHV0RmlnVGV4dCk7XG4gICAgfVxuICAgIC8vIHJlbW92ZSBoYXJkYmxhbmtzXG4gICAgaWYgKG9wdHMuc2hvd0hhcmRCbGFua3MgIT09IHRydWUpIHtcbiAgICAgIG91dHB1dEZpZ0xpbmVzLmZvckVhY2goZnVuY3Rpb24gKG91dHB1dEZpZ1RleHQpIHtcbiAgICAgICAgbGVuID0gb3V0cHV0RmlnVGV4dC5sZW5ndGg7XG4gICAgICAgIGZvciAocm93ID0gMDsgcm93IDwgbGVuOyByb3crKykge1xuICAgICAgICAgIG91dHB1dEZpZ1RleHRbcm93XSA9IG91dHB1dEZpZ1RleHRbcm93XS5yZXBsYWNlKFxuICAgICAgICAgICAgbmV3IFJlZ0V4cChcIlxcXFxcIiArIG9wdHMuaGFyZEJsYW5rLCBcImdcIiksXG4gICAgICAgICAgICBcIiBcIlxuICAgICAgICAgICk7XG4gICAgICAgIH1cbiAgICAgIH0pO1xuICAgIH1cbiAgICByZXR1cm4gb3V0cHV0RmlnTGluZXM7XG4gIH1cblxuICAvLyAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG4gIC8vIFBhcnNpbmcgYW5kIEdlbmVyYXRpb24gbWV0aG9kc1xuXG4gIGNvbnN0IGdldEhvcml6b250YWxGaXR0aW5nUnVsZXMgPSBmdW5jdGlvbiAobGF5b3V0LCBvcHRpb25zKSB7XG4gICAgbGV0IHByb3BzID0gW1xuICAgICAgICBcImhMYXlvdXRcIixcbiAgICAgICAgXCJoUnVsZTFcIixcbiAgICAgICAgXCJoUnVsZTJcIixcbiAgICAgICAgXCJoUnVsZTNcIixcbiAgICAgICAgXCJoUnVsZTRcIixcbiAgICAgICAgXCJoUnVsZTVcIixcbiAgICAgICAgXCJoUnVsZTZcIixcbiAgICAgIF0sXG4gICAgICBwYXJhbXMgPSB7fSxcbiAgICAgIGlpO1xuICAgIGlmIChsYXlvdXQgPT09IFwiZGVmYXVsdFwiKSB7XG4gICAgICBmb3IgKGlpID0gMDsgaWkgPCBwcm9wcy5sZW5ndGg7IGlpKyspIHtcbiAgICAgICAgcGFyYW1zW3Byb3BzW2lpXV0gPSBvcHRpb25zLmZpdHRpbmdSdWxlc1twcm9wc1tpaV1dO1xuICAgICAgfVxuICAgIH0gZWxzZSBpZiAobGF5b3V0ID09PSBcImZ1bGxcIikge1xuICAgICAgcGFyYW1zID0ge1xuICAgICAgICBoTGF5b3V0OiBGVUxMX1dJRFRILFxuICAgICAgICBoUnVsZTE6IGZhbHNlLFxuICAgICAgICBoUnVsZTI6IGZhbHNlLFxuICAgICAgICBoUnVsZTM6IGZhbHNlLFxuICAgICAgICBoUnVsZTQ6IGZhbHNlLFxuICAgICAgICBoUnVsZTU6IGZhbHNlLFxuICAgICAgICBoUnVsZTY6IGZhbHNlLFxuICAgICAgfTtcbiAgICB9IGVsc2UgaWYgKGxheW91dCA9PT0gXCJmaXR0ZWRcIikge1xuICAgICAgcGFyYW1zID0ge1xuICAgICAgICBoTGF5b3V0OiBGSVRUSU5HLFxuICAgICAgICBoUnVsZTE6IGZhbHNlLFxuICAgICAgICBoUnVsZTI6IGZhbHNlLFxuICAgICAgICBoUnVsZTM6IGZhbHNlLFxuICAgICAgICBoUnVsZTQ6IGZhbHNlLFxuICAgICAgICBoUnVsZTU6IGZhbHNlLFxuICAgICAgICBoUnVsZTY6IGZhbHNlLFxuICAgICAgfTtcbiAgICB9IGVsc2UgaWYgKGxheW91dCA9PT0gXCJjb250cm9sbGVkIHNtdXNoaW5nXCIpIHtcbiAgICAgIHBhcmFtcyA9IHtcbiAgICAgICAgaExheW91dDogQ09OVFJPTExFRF9TTVVTSElORyxcbiAgICAgICAgaFJ1bGUxOiB0cnVlLFxuICAgICAgICBoUnVsZTI6IHRydWUsXG4gICAgICAgIGhSdWxlMzogdHJ1ZSxcbiAgICAgICAgaFJ1bGU0OiB0cnVlLFxuICAgICAgICBoUnVsZTU6IHRydWUsXG4gICAgICAgIGhSdWxlNjogdHJ1ZSxcbiAgICAgIH07XG4gICAgfSBlbHNlIGlmIChsYXlvdXQgPT09IFwidW5pdmVyc2FsIHNtdXNoaW5nXCIpIHtcbiAgICAgIHBhcmFtcyA9IHtcbiAgICAgICAgaExheW91dDogU01VU0hJTkcsXG4gICAgICAgIGhSdWxlMTogZmFsc2UsXG4gICAgICAgIGhSdWxlMjogZmFsc2UsXG4gICAgICAgIGhSdWxlMzogZmFsc2UsXG4gICAgICAgIGhSdWxlNDogZmFsc2UsXG4gICAgICAgIGhSdWxlNTogZmFsc2UsXG4gICAgICAgIGhSdWxlNjogZmFsc2UsXG4gICAgICB9O1xuICAgIH0gZWxzZSB7XG4gICAgICByZXR1cm47XG4gICAgfVxuICAgIHJldHVybiBwYXJhbXM7XG4gIH07XG5cbiAgY29uc3QgZ2V0VmVydGljYWxGaXR0aW5nUnVsZXMgPSBmdW5jdGlvbiAobGF5b3V0LCBvcHRpb25zKSB7XG4gICAgbGV0IHByb3BzID0gW1widkxheW91dFwiLCBcInZSdWxlMVwiLCBcInZSdWxlMlwiLCBcInZSdWxlM1wiLCBcInZSdWxlNFwiLCBcInZSdWxlNVwiXSxcbiAgICAgIHBhcmFtcyA9IHt9LFxuICAgICAgaWk7XG4gICAgaWYgKGxheW91dCA9PT0gXCJkZWZhdWx0XCIpIHtcbiAgICAgIGZvciAoaWkgPSAwOyBpaSA8IHByb3BzLmxlbmd0aDsgaWkrKykge1xuICAgICAgICBwYXJhbXNbcHJvcHNbaWldXSA9IG9wdGlvbnMuZml0dGluZ1J1bGVzW3Byb3BzW2lpXV07XG4gICAgICB9XG4gICAgfSBlbHNlIGlmIChsYXlvdXQgPT09IFwiZnVsbFwiKSB7XG4gICAgICBwYXJhbXMgPSB7XG4gICAgICAgIHZMYXlvdXQ6IEZVTExfV0lEVEgsXG4gICAgICAgIHZSdWxlMTogZmFsc2UsXG4gICAgICAgIHZSdWxlMjogZmFsc2UsXG4gICAgICAgIHZSdWxlMzogZmFsc2UsXG4gICAgICAgIHZSdWxlNDogZmFsc2UsXG4gICAgICAgIHZSdWxlNTogZmFsc2UsXG4gICAgICB9O1xuICAgIH0gZWxzZSBpZiAobGF5b3V0ID09PSBcImZpdHRlZFwiKSB7XG4gICAgICBwYXJhbXMgPSB7XG4gICAgICAgIHZMYXlvdXQ6IEZJVFRJTkcsXG4gICAgICAgIHZSdWxlMTogZmFsc2UsXG4gICAgICAgIHZSdWxlMjogZmFsc2UsXG4gICAgICAgIHZSdWxlMzogZmFsc2UsXG4gICAgICAgIHZSdWxlNDogZmFsc2UsXG4gICAgICAgIHZSdWxlNTogZmFsc2UsXG4gICAgICB9O1xuICAgIH0gZWxzZSBpZiAobGF5b3V0ID09PSBcImNvbnRyb2xsZWQgc211c2hpbmdcIikge1xuICAgICAgcGFyYW1zID0ge1xuICAgICAgICB2TGF5b3V0OiBDT05UUk9MTEVEX1NNVVNISU5HLFxuICAgICAgICB2UnVsZTE6IHRydWUsXG4gICAgICAgIHZSdWxlMjogdHJ1ZSxcbiAgICAgICAgdlJ1bGUzOiB0cnVlLFxuICAgICAgICB2UnVsZTQ6IHRydWUsXG4gICAgICAgIHZSdWxlNTogdHJ1ZSxcbiAgICAgIH07XG4gICAgfSBlbHNlIGlmIChsYXlvdXQgPT09IFwidW5pdmVyc2FsIHNtdXNoaW5nXCIpIHtcbiAgICAgIHBhcmFtcyA9IHtcbiAgICAgICAgdkxheW91dDogU01VU0hJTkcsXG4gICAgICAgIHZSdWxlMTogZmFsc2UsXG4gICAgICAgIHZSdWxlMjogZmFsc2UsXG4gICAgICAgIHZSdWxlMzogZmFsc2UsXG4gICAgICAgIHZSdWxlNDogZmFsc2UsXG4gICAgICAgIHZSdWxlNTogZmFsc2UsXG4gICAgICB9O1xuICAgIH0gZWxzZSB7XG4gICAgICByZXR1cm47XG4gICAgfVxuICAgIHJldHVybiBwYXJhbXM7XG4gIH07XG5cbiAgLypcbiAgICAgICAgR2VuZXJhdGVzIHRoZSBBU0NJSSBBcnRcbiAgICAgICAgLSBmb250TmFtZTogRm9udCB0byB1c2VcbiAgICAgICAgLSBvcHRpb246IE9wdGlvbnMgdG8gb3ZlcnJpZGUgdGhlIGRlZmF1bHRzXG4gICAgICAgIC0gdHh0OiBUaGUgdGV4dCB0byBtYWtlIGludG8gQVNDSUkgQXJ0XG4gICAgKi9cbiAgY29uc3QgZ2VuZXJhdGVUZXh0ID0gZnVuY3Rpb24gKGZvbnROYW1lLCBvcHRpb25zLCB0eHQpIHtcbiAgICB0eHQgPSB0eHQucmVwbGFjZSgvXFxyXFxuL2csIFwiXFxuXCIpLnJlcGxhY2UoL1xcci9nLCBcIlxcblwiKTtcbiAgICBsZXQgbGluZXMgPSB0eHQuc3BsaXQoXCJcXG5cIik7XG4gICAgbGV0IGZpZ0xpbmVzID0gW107XG4gICAgbGV0IGlpLCBsZW4sIG91dHB1dDtcbiAgICBsZW4gPSBsaW5lcy5sZW5ndGg7XG4gICAgZm9yIChpaSA9IDA7IGlpIDwgbGVuOyBpaSsrKSB7XG4gICAgICBmaWdMaW5lcyA9IGZpZ0xpbmVzLmNvbmNhdChcbiAgICAgICAgZ2VuZXJhdGVGaWdUZXh0TGluZXMobGluZXNbaWldLCBmaWdGb250c1tmb250TmFtZV0sIG9wdGlvbnMpXG4gICAgICApO1xuICAgIH1cbiAgICBsZW4gPSBmaWdMaW5lcy5sZW5ndGg7XG4gICAgb3V0cHV0ID0gZmlnTGluZXNbMF07XG4gICAgZm9yIChpaSA9IDE7IGlpIDwgbGVuOyBpaSsrKSB7XG4gICAgICBvdXRwdXQgPSBzbXVzaFZlcnRpY2FsRmlnTGluZXMob3V0cHV0LCBmaWdMaW5lc1tpaV0sIG9wdGlvbnMpO1xuICAgIH1cblxuICAgIHJldHVybiBvdXRwdXQgPyBvdXRwdXQuam9pbihcIlxcblwiKSA6IFwiXCI7XG4gIH07XG5cbiAgLypcbiAgICAgIHRha2VzIGFzc2lnbmVkIG9wdGlvbnMgYW5kIG1lcmdlcyB0aGVtIHdpdGggdGhlIGRlZmF1bHQgb3B0aW9ucyBmcm9tIHRoZSBjaG9vc2VuIGZvbnRcbiAgICAgKi9cbiAgZnVuY3Rpb24gX3Jld29ya0ZvbnRPcHRzKGZvbnRPcHRzLCBvcHRpb25zKSB7XG4gICAgbGV0IG15T3B0cyA9IEpTT04ucGFyc2UoSlNPTi5zdHJpbmdpZnkoZm9udE9wdHMpKSwgLy8gbWFrZSBhIGNvcHkgYmVjYXVzZSB3ZSBtYXkgZWRpdCB0aGlzIChzZWUgYmVsb3cpXG4gICAgICBwYXJhbXMsXG4gICAgICBwcm9wO1xuXG4gICAgLypcbiAgICAgICAgIElmIHRoZSB1c2VyIGlzIGNob3NpbmcgdG8gdXNlIGEgc3BlY2lmaWMgdHlwZSBvZiBsYXlvdXQgKGUuZy4sICdmdWxsJywgJ2ZpdHRlZCcsIGV0YyBldGMpXG4gICAgICAgICBUaGVuIHdlIG5lZWQgdG8gb3ZlcnJpZGUgdGhlIGRlZmF1bHQgZm9udCBvcHRpb25zLlxuICAgICAgICAgKi9cbiAgICBpZiAodHlwZW9mIG9wdGlvbnMuaG9yaXpvbnRhbExheW91dCAhPT0gXCJ1bmRlZmluZWRcIikge1xuICAgICAgcGFyYW1zID0gZ2V0SG9yaXpvbnRhbEZpdHRpbmdSdWxlcyhvcHRpb25zLmhvcml6b250YWxMYXlvdXQsIGZvbnRPcHRzKTtcbiAgICAgIGZvciAocHJvcCBpbiBwYXJhbXMpIHtcbiAgICAgICAgaWYgKHBhcmFtcy5oYXNPd25Qcm9wZXJ0eShwcm9wKSkge1xuICAgICAgICAgIG15T3B0cy5maXR0aW5nUnVsZXNbcHJvcF0gPSBwYXJhbXNbcHJvcF07XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9XG4gICAgaWYgKHR5cGVvZiBvcHRpb25zLnZlcnRpY2FsTGF5b3V0ICE9PSBcInVuZGVmaW5lZFwiKSB7XG4gICAgICBwYXJhbXMgPSBnZXRWZXJ0aWNhbEZpdHRpbmdSdWxlcyhvcHRpb25zLnZlcnRpY2FsTGF5b3V0LCBmb250T3B0cyk7XG4gICAgICBmb3IgKHByb3AgaW4gcGFyYW1zKSB7XG4gICAgICAgIGlmIChwYXJhbXMuaGFzT3duUHJvcGVydHkocHJvcCkpIHtcbiAgICAgICAgICBteU9wdHMuZml0dGluZ1J1bGVzW3Byb3BdID0gcGFyYW1zW3Byb3BdO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgfVxuICAgIG15T3B0cy5wcmludERpcmVjdGlvbiA9XG4gICAgICB0eXBlb2Ygb3B0aW9ucy5wcmludERpcmVjdGlvbiAhPT0gXCJ1bmRlZmluZWRcIlxuICAgICAgICA/IG9wdGlvbnMucHJpbnREaXJlY3Rpb25cbiAgICAgICAgOiBmb250T3B0cy5wcmludERpcmVjdGlvbjtcbiAgICBteU9wdHMuc2hvd0hhcmRCbGFua3MgPSBvcHRpb25zLnNob3dIYXJkQmxhbmtzIHx8IGZhbHNlO1xuICAgIG15T3B0cy53aWR0aCA9IG9wdGlvbnMud2lkdGggfHwgLTE7XG4gICAgbXlPcHRzLndoaXRlc3BhY2VCcmVhayA9IG9wdGlvbnMud2hpdGVzcGFjZUJyZWFrIHx8IGZhbHNlO1xuXG4gICAgcmV0dXJuIG15T3B0cztcbiAgfVxuXG4gIC8vIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cbiAgLy8gUHVibGljIG1ldGhvZHNcblxuICAvKlxuICAgICAgICBBIHNob3J0LWN1dCBmb3IgdGhlIGZpZ2xldC50ZXh0IG1ldGhvZFxuXG4gICAgICAgIFBhcmFtZXRlcnM6XG4gICAgICAgIC0gdHh0IChzdHJpbmcpOiBUaGUgdGV4dCB0byBtYWtlIGludG8gQVNDSUkgQXJ0XG4gICAgICAgIC0gb3B0aW9ucyAob2JqZWN0L3N0cmluZyAtIG9wdGlvbmFsKTogT3B0aW9ucyB0aGF0IHdpbGwgb3ZlcnJpZGUgdGhlIGN1cnJlbnQgZm9udCdzIGRlZmF1bHQgb3B0aW9ucy5cbiAgICAgICAgICBJZiBhIHN0cmluZyBpcyBwcm92aWRlZCBpbnN0ZWFkIG9mIGFuIG9iamVjdCwgaXQgaXMgYXNzdW1lZCB0byBiZSB0aGUgZm9udCBuYW1lLlxuXG4gICAgICAgICAgICAqIGZvbnRcbiAgICAgICAgICAgICogaG9yaXpvbnRhbExheW91dFxuICAgICAgICAgICAgKiB2ZXJ0aWNhbExheW91dFxuICAgICAgICAgICAgKiBzaG93SGFyZEJsYW5rcyAtIFdvbnQgcmVtb3ZlIGhhcmRibGFuayBjaGFyYWN0ZXJzXG5cbiAgICAgICAgLSBuZXh0IChmdW5jdGlvbik6IEEgY2FsbGJhY2sgZnVuY3Rpb24sIGl0IHdpbGwgY29udGFpbmVkIHRoZSBvdXRwdXR0ZWQgQVNDSUkgQXJ0LlxuICAgICovXG4gIGNvbnN0IG1lID0gZnVuY3Rpb24gKHR4dCwgb3B0aW9ucywgbmV4dCkge1xuICAgIHJldHVybiBtZS50ZXh0KHR4dCwgb3B0aW9ucywgbmV4dCk7XG4gIH07XG4gIG1lLnRleHQgPSBhc3luYyBmdW5jdGlvbiAodHh0LCBvcHRpb25zLCBuZXh0KSB7XG4gICAgbGV0IGZvbnROYW1lID0gXCJcIjtcblxuICAgIC8vIFZhbGlkYXRlIGlucHV0c1xuICAgIHR4dCA9IHR4dCArIFwiXCI7XG5cbiAgICBpZiAodHlwZW9mIGFyZ3VtZW50c1sxXSA9PT0gXCJmdW5jdGlvblwiKSB7XG4gICAgICBuZXh0ID0gb3B0aW9ucztcbiAgICAgIG9wdGlvbnMgPSB7fTtcbiAgICAgIG9wdGlvbnMuZm9udCA9IGZpZ0RlZmF1bHRzLmZvbnQ7IC8vIGRlZmF1bHQgZm9udFxuICAgIH1cblxuICAgIGlmICh0eXBlb2Ygb3B0aW9ucyA9PT0gXCJzdHJpbmdcIikge1xuICAgICAgZm9udE5hbWUgPSBvcHRpb25zO1xuICAgICAgb3B0aW9ucyA9IHt9O1xuICAgIH0gZWxzZSB7XG4gICAgICBvcHRpb25zID0gb3B0aW9ucyB8fCB7fTtcbiAgICAgIGZvbnROYW1lID0gb3B0aW9ucy5mb250IHx8IGZpZ0RlZmF1bHRzLmZvbnQ7XG4gICAgfVxuXG4gICAgcmV0dXJuIGF3YWl0IG5ldyBQcm9taXNlKChyZXNvbHZlLCByZWplY3QpID0+IHtcbiAgICAgIC8qXG4gICAgICAgICAgTG9hZCB0aGUgZm9udC4gSWYgaXQgbG9hZHMsIGl0J3MgZGF0YSB3aWxsIGJlIGNvbnRhaW5lZCBpbiB0aGUgZmlnRm9udHMgb2JqZWN0LlxuICAgICAgICAgIFRoZSBjYWxsYmFjayB3aWxsIHJlY2lldmUgYSBmb250c09wdHMgb2JqZWN0LCB3aGljaCBjb250YWlucyB0aGUgZGVmYXVsdFxuICAgICAgICAgIG9wdGlvbnMgb2YgdGhlIGZvbnQgKGl0cyBmaXR0aW5nIHJ1bGVzLCBldGMgZXRjKS5cbiAgICAgICovXG4gICAgICBtZS5sb2FkRm9udChmb250TmFtZSwgZnVuY3Rpb24gKGVyciwgZm9udE9wdHMpIHtcbiAgICAgICAgaWYgKGVycikge1xuICAgICAgICAgIHJlamVjdChlcnIpO1xuICAgICAgICAgIGlmIChuZXh0KSBuZXh0KGVycik7XG4gICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG5cbiAgICAgICAgY29uc3QgZ2VuZXJhdGVkVHh0ID0gZ2VuZXJhdGVUZXh0KFxuICAgICAgICAgIGZvbnROYW1lLFxuICAgICAgICAgIF9yZXdvcmtGb250T3B0cyhmb250T3B0cywgb3B0aW9ucyksXG4gICAgICAgICAgdHh0XG4gICAgICAgICk7XG5cbiAgICAgICAgcmVzb2x2ZShnZW5lcmF0ZWRUeHQpO1xuICAgICAgICBpZiAobmV4dCkgbmV4dChudWxsLCBnZW5lcmF0ZWRUeHQpO1xuICAgICAgfSk7XG4gICAgfSk7XG4gIH07XG5cbiAgLypcbiAgICAgICAgU3luY2hyb25vdXMgdmVyc2lvbiBvZiBmaWdsZXQudGV4dC5cbiAgICAgICAgQWNjZXB0cyB0aGUgc2FtZSBwYXJhbWV0ZXJzLlxuICAgICAqL1xuICBtZS50ZXh0U3luYyA9IGZ1bmN0aW9uICh0eHQsIG9wdGlvbnMpIHtcbiAgICBsZXQgZm9udE5hbWUgPSBcIlwiO1xuXG4gICAgLy8gVmFsaWRhdGUgaW5wdXRzXG4gICAgdHh0ID0gdHh0ICsgXCJcIjtcblxuICAgIGlmICh0eXBlb2Ygb3B0aW9ucyA9PT0gXCJzdHJpbmdcIikge1xuICAgICAgZm9udE5hbWUgPSBvcHRpb25zO1xuICAgICAgb3B0aW9ucyA9IHt9O1xuICAgIH0gZWxzZSB7XG4gICAgICBvcHRpb25zID0gb3B0aW9ucyB8fCB7fTtcbiAgICAgIGZvbnROYW1lID0gb3B0aW9ucy5mb250IHx8IGZpZ0RlZmF1bHRzLmZvbnQ7XG4gICAgfVxuXG4gICAgdmFyIGZvbnRPcHRzID0gX3Jld29ya0ZvbnRPcHRzKG1lLmxvYWRGb250U3luYyhmb250TmFtZSksIG9wdGlvbnMpO1xuICAgIHJldHVybiBnZW5lcmF0ZVRleHQoZm9udE5hbWUsIGZvbnRPcHRzLCB0eHQpO1xuICB9O1xuXG4gIC8qXG4gICAgICAgIFJldHVybnMgbWV0YWRhdGEgYWJvdXQgYSBzcGVjZmljIEZJR2xldCBmb250LlxuXG4gICAgICAgIFJldHVybnM6XG4gICAgICAgICAgICBuZXh0KGVyciwgb3B0aW9ucywgaGVhZGVyQ29tbWVudClcbiAgICAgICAgICAgIC0gZXJyOiBUaGUgZXJyb3IgaWYgYW4gZXJyb3Igb2NjdXJyZWQsIG90aGVyd2lzZSBudWxsL2ZhbHNleS5cbiAgICAgICAgICAgIC0gb3B0aW9ucyAob2JqZWN0KTogVGhlIG9wdGlvbnMgZGVmaW5lZCBmb3IgdGhlIGZvbnQuXG4gICAgICAgICAgICAtIGhlYWRlckNvbW1lbnQgKHN0cmluZyk6IFRoZSBmb250J3MgaGVhZGVyIGNvbW1lbnQuXG4gICAgKi9cbiAgbWUubWV0YWRhdGEgPSBmdW5jdGlvbiAoZm9udE5hbWUsIG5leHQpIHtcbiAgICBmb250TmFtZSA9IGZvbnROYW1lICsgXCJcIjtcblxuICAgIC8qXG4gICAgICAgICAgICBMb2FkIHRoZSBmb250LiBJZiBpdCBsb2FkcywgaXQncyBkYXRhIHdpbGwgYmUgY29udGFpbmVkIGluIHRoZSBmaWdGb250cyBvYmplY3QuXG4gICAgICAgICAgICBUaGUgY2FsbGJhY2sgd2lsbCByZWNpZXZlIGEgZm9udHNPcHRzIG9iamVjdCwgd2hpY2ggY29udGFpbnMgdGhlIGRlZmF1bHRcbiAgICAgICAgICAgIG9wdGlvbnMgb2YgdGhlIGZvbnQgKGl0cyBmaXR0aW5nIHJ1bGVzLCBldGMgZXRjKS5cbiAgICAgICAgKi9cbiAgICBtZS5sb2FkRm9udChmb250TmFtZSwgZnVuY3Rpb24gKGVyciwgZm9udE9wdHMpIHtcbiAgICAgIGlmIChlcnIpIHtcbiAgICAgICAgbmV4dChlcnIpO1xuICAgICAgICByZXR1cm47XG4gICAgICB9XG5cbiAgICAgIG5leHQobnVsbCwgZm9udE9wdHMsIGZpZ0ZvbnRzW2ZvbnROYW1lXS5jb21tZW50KTtcbiAgICB9KTtcbiAgfTtcblxuICAvKlxuICAgICAgICBBbGxvd3MgeW91IHRvIG92ZXJyaWRlIGRlZmF1bHRzLiBTZWUgdGhlIGRlZmluaXRpb24gb2YgdGhlIGZpZ0RlZmF1bHRzIG9iamVjdCB1cCBhYm92ZVxuICAgICAgICB0byBzZWUgd2hhdCBwcm9wZXJ0aWVzIGNhbiBiZSBvdmVycmlkZGVuLlxuICAgICAgICBSZXR1cm5zIHRoZSBvcHRpb25zIGZvciB0aGUgZm9udC5cbiAgICAqL1xuICBtZS5kZWZhdWx0cyA9IGZ1bmN0aW9uIChvcHRzKSB7XG4gICAgaWYgKHR5cGVvZiBvcHRzID09PSBcIm9iamVjdFwiICYmIG9wdHMgIT09IG51bGwpIHtcbiAgICAgIGZvciAodmFyIHByb3AgaW4gb3B0cykge1xuICAgICAgICBpZiAob3B0cy5oYXNPd25Qcm9wZXJ0eShwcm9wKSkge1xuICAgICAgICAgIGZpZ0RlZmF1bHRzW3Byb3BdID0gb3B0c1twcm9wXTtcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH1cbiAgICByZXR1cm4gSlNPTi5wYXJzZShKU09OLnN0cmluZ2lmeShmaWdEZWZhdWx0cykpO1xuICB9O1xuXG4gIC8qXG4gICAgICAgIFBhcnNlcyBkYXRhIGZyb20gYSBGSUdsZXQgZm9udCBmaWxlIGFuZCBwbGFjZXMgaXQgaW50byB0aGUgZmlnRm9udHMgb2JqZWN0LlxuICAgICovXG4gIG1lLnBhcnNlRm9udCA9IGZ1bmN0aW9uIChmb250TmFtZSwgZGF0YSkge1xuICAgIGRhdGEgPSBkYXRhLnJlcGxhY2UoL1xcclxcbi9nLCBcIlxcblwiKS5yZXBsYWNlKC9cXHIvZywgXCJcXG5cIik7XG4gICAgZmlnRm9udHNbZm9udE5hbWVdID0ge307XG5cbiAgICB2YXIgbGluZXMgPSBkYXRhLnNwbGl0KFwiXFxuXCIpO1xuICAgIHZhciBoZWFkZXJEYXRhID0gbGluZXMuc3BsaWNlKDAsIDEpWzBdLnNwbGl0KFwiIFwiKTtcbiAgICB2YXIgZmlnRm9udCA9IGZpZ0ZvbnRzW2ZvbnROYW1lXTtcbiAgICB2YXIgb3B0cyA9IHt9O1xuXG4gICAgb3B0cy5oYXJkQmxhbmsgPSBoZWFkZXJEYXRhWzBdLnN1YnN0cig1LCAxKTtcbiAgICBvcHRzLmhlaWdodCA9IHBhcnNlSW50KGhlYWRlckRhdGFbMV0sIDEwKTtcbiAgICBvcHRzLmJhc2VsaW5lID0gcGFyc2VJbnQoaGVhZGVyRGF0YVsyXSwgMTApO1xuICAgIG9wdHMubWF4TGVuZ3RoID0gcGFyc2VJbnQoaGVhZGVyRGF0YVszXSwgMTApO1xuICAgIG9wdHMub2xkTGF5b3V0ID0gcGFyc2VJbnQoaGVhZGVyRGF0YVs0XSwgMTApO1xuICAgIG9wdHMubnVtQ29tbWVudExpbmVzID0gcGFyc2VJbnQoaGVhZGVyRGF0YVs1XSwgMTApO1xuICAgIG9wdHMucHJpbnREaXJlY3Rpb24gPVxuICAgICAgaGVhZGVyRGF0YS5sZW5ndGggPj0gNiA/IHBhcnNlSW50KGhlYWRlckRhdGFbNl0sIDEwKSA6IDA7XG4gICAgb3B0cy5mdWxsTGF5b3V0ID1cbiAgICAgIGhlYWRlckRhdGEubGVuZ3RoID49IDcgPyBwYXJzZUludChoZWFkZXJEYXRhWzddLCAxMCkgOiBudWxsO1xuICAgIG9wdHMuY29kZVRhZ0NvdW50ID1cbiAgICAgIGhlYWRlckRhdGEubGVuZ3RoID49IDggPyBwYXJzZUludChoZWFkZXJEYXRhWzhdLCAxMCkgOiBudWxsO1xuICAgIG9wdHMuZml0dGluZ1J1bGVzID0gZ2V0U211c2hpbmdSdWxlcyhvcHRzLm9sZExheW91dCwgb3B0cy5mdWxsTGF5b3V0KTtcblxuICAgIGZpZ0ZvbnQub3B0aW9ucyA9IG9wdHM7XG5cbiAgICAvLyBlcnJvciBjaGVja1xuICAgIGlmIChcbiAgICAgIG9wdHMuaGFyZEJsYW5rLmxlbmd0aCAhPT0gMSB8fFxuICAgICAgaXNOYU4ob3B0cy5oZWlnaHQpIHx8XG4gICAgICBpc05hTihvcHRzLmJhc2VsaW5lKSB8fFxuICAgICAgaXNOYU4ob3B0cy5tYXhMZW5ndGgpIHx8XG4gICAgICBpc05hTihvcHRzLm9sZExheW91dCkgfHxcbiAgICAgIGlzTmFOKG9wdHMubnVtQ29tbWVudExpbmVzKVxuICAgICkge1xuICAgICAgdGhyb3cgbmV3IEVycm9yKFwiRklHbGV0IGhlYWRlciBjb250YWlucyBpbnZhbGlkIHZhbHVlcy5cIik7XG4gICAgfVxuXG4gICAgLypcbiAgICAgICAgICAgIEFsbCBGSUdsZXQgZm9udHMgbXVzdCBjb250YWluIGNoYXJzIDMyLTEyNiwgMTk2LCAyMTQsIDIyMCwgMjI4LCAyNDYsIDI1MiwgMjIzXG4gICAgICAgICovXG5cbiAgICBsZXQgY2hhck51bXMgPSBbXSxcbiAgICAgIGlpO1xuICAgIGZvciAoaWkgPSAzMjsgaWkgPD0gMTI2OyBpaSsrKSB7XG4gICAgICBjaGFyTnVtcy5wdXNoKGlpKTtcbiAgICB9XG4gICAgY2hhck51bXMgPSBjaGFyTnVtcy5jb25jYXQoMTk2LCAyMTQsIDIyMCwgMjI4LCAyNDYsIDI1MiwgMjIzKTtcblxuICAgIC8vIGVycm9yIGNoZWNrIC0gdmFsaWRhdGUgdGhhdCB0aGVyZSBhcmUgZW5vdWdoIGxpbmVzIGluIHRoZSBmaWxlXG4gICAgaWYgKGxpbmVzLmxlbmd0aCA8IG9wdHMubnVtQ29tbWVudExpbmVzICsgb3B0cy5oZWlnaHQgKiBjaGFyTnVtcy5sZW5ndGgpIHtcbiAgICAgIHRocm93IG5ldyBFcnJvcihcIkZJR2xldCBmaWxlIGlzIG1pc3NpbmcgZGF0YS5cIik7XG4gICAgfVxuXG4gICAgLypcbiAgICAgICAgICAgIFBhcnNlIG91dCB0aGUgY29udGV4dCBvZiB0aGUgZmlsZSBhbmQgcHV0IGl0IGludG8gb3VyIGZpZ0ZvbnQgb2JqZWN0XG4gICAgICAgICovXG5cbiAgICBsZXQgY051bSxcbiAgICAgIGVuZENoYXJSZWdFeCxcbiAgICAgIHBhcnNlRXJyb3IgPSBmYWxzZTtcblxuICAgIGZpZ0ZvbnQuY29tbWVudCA9IGxpbmVzLnNwbGljZSgwLCBvcHRzLm51bUNvbW1lbnRMaW5lcykuam9pbihcIlxcblwiKTtcbiAgICBmaWdGb250Lm51bUNoYXJzID0gMDtcblxuICAgIHdoaWxlIChsaW5lcy5sZW5ndGggPiAwICYmIGZpZ0ZvbnQubnVtQ2hhcnMgPCBjaGFyTnVtcy5sZW5ndGgpIHtcbiAgICAgIGNOdW0gPSBjaGFyTnVtc1tmaWdGb250Lm51bUNoYXJzXTtcbiAgICAgIGZpZ0ZvbnRbY051bV0gPSBsaW5lcy5zcGxpY2UoMCwgb3B0cy5oZWlnaHQpO1xuICAgICAgLy8gcmVtb3ZlIGVuZCBzdWItY2hhcnNcbiAgICAgIGZvciAoaWkgPSAwOyBpaSA8IG9wdHMuaGVpZ2h0OyBpaSsrKSB7XG4gICAgICAgIGlmICh0eXBlb2YgZmlnRm9udFtjTnVtXVtpaV0gPT09IFwidW5kZWZpbmVkXCIpIHtcbiAgICAgICAgICBmaWdGb250W2NOdW1dW2lpXSA9IFwiXCI7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgZW5kQ2hhclJlZ0V4ID0gbmV3IFJlZ0V4cChcbiAgICAgICAgICAgIFwiXFxcXFwiICtcbiAgICAgICAgICAgICAgZmlnRm9udFtjTnVtXVtpaV0uc3Vic3RyKGZpZ0ZvbnRbY051bV1baWldLmxlbmd0aCAtIDEsIDEpICtcbiAgICAgICAgICAgICAgXCIrJFwiXG4gICAgICAgICAgKTtcbiAgICAgICAgICBmaWdGb250W2NOdW1dW2lpXSA9IGZpZ0ZvbnRbY051bV1baWldLnJlcGxhY2UoZW5kQ2hhclJlZ0V4LCBcIlwiKTtcbiAgICAgICAgfVxuICAgICAgfVxuICAgICAgZmlnRm9udC5udW1DaGFycysrO1xuICAgIH1cblxuICAgIC8qXG4gICAgICAgICAgICBOb3cgd2UgY2hlY2sgdG8gc2VlIGlmIGFueSBhZGRpdGlvbmFsIGNoYXJhY3RlcnMgYXJlIHByZXNlbnRcbiAgICAgICAgKi9cblxuICAgIHdoaWxlIChsaW5lcy5sZW5ndGggPiAwKSB7XG4gICAgICBjTnVtID0gbGluZXMuc3BsaWNlKDAsIDEpWzBdLnNwbGl0KFwiIFwiKVswXTtcbiAgICAgIGlmICgvXjBbeFhdWzAtOWEtZkEtRl0rJC8udGVzdChjTnVtKSkge1xuICAgICAgICBjTnVtID0gcGFyc2VJbnQoY051bSwgMTYpO1xuICAgICAgfSBlbHNlIGlmICgvXjBbMC03XSskLy50ZXN0KGNOdW0pKSB7XG4gICAgICAgIGNOdW0gPSBwYXJzZUludChjTnVtLCA4KTtcbiAgICAgIH0gZWxzZSBpZiAoL15bMC05XSskLy50ZXN0KGNOdW0pKSB7XG4gICAgICAgIGNOdW0gPSBwYXJzZUludChjTnVtLCAxMCk7XG4gICAgICB9IGVsc2UgaWYgKC9eLTBbeFhdWzAtOWEtZkEtRl0rJC8udGVzdChjTnVtKSkge1xuICAgICAgICBjTnVtID0gcGFyc2VJbnQoY051bSwgMTYpO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgaWYgKGNOdW0gPT09IFwiXCIpIHtcbiAgICAgICAgICBicmVhaztcbiAgICAgICAgfVxuICAgICAgICAvLyBzb21ldGhpbmcncyB3cm9uZ1xuICAgICAgICBjb25zb2xlLmxvZyhcIkludmFsaWQgZGF0YTpcIiArIGNOdW0pO1xuICAgICAgICBwYXJzZUVycm9yID0gdHJ1ZTtcbiAgICAgICAgYnJlYWs7XG4gICAgICB9XG5cbiAgICAgIGZpZ0ZvbnRbY051bV0gPSBsaW5lcy5zcGxpY2UoMCwgb3B0cy5oZWlnaHQpO1xuICAgICAgLy8gcmVtb3ZlIGVuZCBzdWItY2hhcnNcbiAgICAgIGZvciAoaWkgPSAwOyBpaSA8IG9wdHMuaGVpZ2h0OyBpaSsrKSB7XG4gICAgICAgIGlmICh0eXBlb2YgZmlnRm9udFtjTnVtXVtpaV0gPT09IFwidW5kZWZpbmVkXCIpIHtcbiAgICAgICAgICBmaWdGb250W2NOdW1dW2lpXSA9IFwiXCI7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgZW5kQ2hhclJlZ0V4ID0gbmV3IFJlZ0V4cChcbiAgICAgICAgICAgIFwiXFxcXFwiICtcbiAgICAgICAgICAgICAgZmlnRm9udFtjTnVtXVtpaV0uc3Vic3RyKGZpZ0ZvbnRbY051bV1baWldLmxlbmd0aCAtIDEsIDEpICtcbiAgICAgICAgICAgICAgXCIrJFwiXG4gICAgICAgICAgKTtcbiAgICAgICAgICBmaWdGb250W2NOdW1dW2lpXSA9IGZpZ0ZvbnRbY051bV1baWldLnJlcGxhY2UoZW5kQ2hhclJlZ0V4LCBcIlwiKTtcbiAgICAgICAgfVxuICAgICAgfVxuICAgICAgZmlnRm9udC5udW1DaGFycysrO1xuICAgIH1cblxuICAgIC8vIGVycm9yIGNoZWNrXG4gICAgaWYgKHBhcnNlRXJyb3IgPT09IHRydWUpIHtcbiAgICAgIHRocm93IG5ldyBFcnJvcihcIkVycm9yIHBhcnNpbmcgZGF0YS5cIik7XG4gICAgfVxuXG4gICAgcmV0dXJuIG9wdHM7XG4gIH07XG5cbiAgLypcbiAgICAgICAgTG9hZHMgYSBmb250LlxuICAgICovXG4gIG1lLmxvYWRGb250ID0gZnVuY3Rpb24gKGZvbnROYW1lLCBuZXh0KSB7XG4gICAgaWYgKGZpZ0ZvbnRzW2ZvbnROYW1lXSkge1xuICAgICAgbmV4dChudWxsLCBmaWdGb250c1tmb250TmFtZV0ub3B0aW9ucyk7XG4gICAgICByZXR1cm47XG4gICAgfVxuXG4gICAgaWYgKHR5cGVvZiBmZXRjaCAhPT0gXCJmdW5jdGlvblwiKSB7XG4gICAgICBjb25zb2xlLmVycm9yKFxuICAgICAgICBcImZpZ2xldC5qcyByZXF1aXJlcyB0aGUgZmV0Y2ggQVBJIG9yIGEgZmV0Y2ggcG9seWZpbGwgc3VjaCBhcyBodHRwczovL2NkbmpzLmNvbS9saWJyYXJpZXMvZmV0Y2hcIlxuICAgICAgKTtcbiAgICAgIHRocm93IG5ldyBFcnJvcihcImZldGNoIGlzIHJlcXVpcmVkIGZvciBmaWdsZXQuanMgdG8gd29yay5cIik7XG4gICAgfVxuXG4gICAgZmV0Y2goZmlnRGVmYXVsdHMuZm9udFBhdGggKyBcIi9cIiArIGZvbnROYW1lICsgXCIuZmxmXCIpXG4gICAgICAudGhlbihmdW5jdGlvbiAocmVzcG9uc2UpIHtcbiAgICAgICAgaWYgKHJlc3BvbnNlLm9rKSB7XG4gICAgICAgICAgcmV0dXJuIHJlc3BvbnNlLnRleHQoKTtcbiAgICAgICAgfVxuXG4gICAgICAgIGNvbnNvbGUubG9nKFwiVW5leHBlY3RlZCByZXNwb25zZVwiLCByZXNwb25zZSk7XG4gICAgICAgIHRocm93IG5ldyBFcnJvcihcIk5ldHdvcmsgcmVzcG9uc2Ugd2FzIG5vdCBvay5cIik7XG4gICAgICB9KVxuICAgICAgLnRoZW4oZnVuY3Rpb24gKHRleHQpIHtcbiAgICAgICAgbmV4dChudWxsLCBtZS5wYXJzZUZvbnQoZm9udE5hbWUsIHRleHQpKTtcbiAgICAgIH0pXG4gICAgICAuY2F0Y2gobmV4dCk7XG4gIH07XG5cbiAgLypcbiAgICAgICAgbG9hZHMgYSBmb250IHN5bmNocm9ub3VzbHksIG5vdCBpbXBsZW1lbnRlZCBmb3IgdGhlIGJyb3dzZXJcbiAgICAgKi9cbiAgbWUubG9hZEZvbnRTeW5jID0gZnVuY3Rpb24gKG5hbWUpIHtcbiAgICBpZiAoZmlnRm9udHNbbmFtZV0pIHtcbiAgICAgIHJldHVybiBmaWdGb250c1tuYW1lXS5vcHRpb25zO1xuICAgIH1cbiAgICB0aHJvdyBuZXcgRXJyb3IoXG4gICAgICBcInN5bmNocm9ub3VzIGZvbnQgbG9hZGluZyBpcyBub3QgaW1wbGVtZW50ZWQgZm9yIHRoZSBicm93c2VyXCJcbiAgICApO1xuICB9O1xuXG4gIC8qXG4gICAgICAgIHByZWxvYWRzIGEgbGlzdCBvZiBmb250cyBwcmlvciB0byB1c2luZyB0ZXh0U3luY1xuICAgICAgICAtIGZvbnRzOiBhbiBhcnJheSBvZiBmb250IG5hbWVzIChpLmUuIFtcIlN0YW5kYXJkXCIsXCJTb2Z0XCJdKVxuICAgICAgICAtIG5leHQ6IGNhbGxiYWNrIGZ1bmN0aW9uXG4gICAgICovXG4gIG1lLnByZWxvYWRGb250cyA9IGZ1bmN0aW9uIChmb250cywgbmV4dCkge1xuICAgIGxldCBmb250RGF0YSA9IFtdO1xuXG4gICAgZm9udHNcbiAgICAgIC5yZWR1Y2UoZnVuY3Rpb24gKHByb21pc2UsIG5hbWUpIHtcbiAgICAgICAgcmV0dXJuIHByb21pc2UudGhlbihmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgcmV0dXJuIGZldGNoKGZpZ0RlZmF1bHRzLmZvbnRQYXRoICsgXCIvXCIgKyBuYW1lICsgXCIuZmxmXCIpXG4gICAgICAgICAgICAudGhlbigocmVzcG9uc2UpID0+IHtcbiAgICAgICAgICAgICAgcmV0dXJuIHJlc3BvbnNlLnRleHQoKTtcbiAgICAgICAgICAgIH0pXG4gICAgICAgICAgICAudGhlbihmdW5jdGlvbiAoZGF0YSkge1xuICAgICAgICAgICAgICBmb250RGF0YS5wdXNoKGRhdGEpO1xuICAgICAgICAgICAgfSk7XG4gICAgICAgIH0pO1xuICAgICAgfSwgUHJvbWlzZS5yZXNvbHZlKCkpXG4gICAgICAudGhlbihmdW5jdGlvbiAocmVzKSB7XG4gICAgICAgIGZvciAodmFyIGkgaW4gZm9udHMpIHtcbiAgICAgICAgICBpZiAoZm9udHMuaGFzT3duUHJvcGVydHkoaSkpIHtcbiAgICAgICAgICAgIG1lLnBhcnNlRm9udChmb250c1tpXSwgZm9udERhdGFbaV0pO1xuICAgICAgICAgIH1cbiAgICAgICAgfVxuXG4gICAgICAgIGlmIChuZXh0KSB7XG4gICAgICAgICAgbmV4dCgpO1xuICAgICAgICB9XG4gICAgICB9KTtcbiAgfTtcblxuICBtZS5maWdGb250cyA9IGZpZ0ZvbnRzO1xuXG4gIHJldHVybiBtZTtcbn0pKCk7XG5cbi8vIGZvciBub2RlLmpzXG5pZiAodHlwZW9mIG1vZHVsZSAhPT0gXCJ1bmRlZmluZWRcIikge1xuICBpZiAodHlwZW9mIG1vZHVsZS5leHBvcnRzICE9PSBcInVuZGVmaW5lZFwiKSB7XG4gICAgbW9kdWxlLmV4cG9ydHMgPSBmaWdsZXQ7XG4gIH1cbn1cbiIsIi8qXG5cdE5vZGUgcGx1Z2luIGZvciBmaWdsZXQuanNcbiovXG5cbmNvbnN0IGZpZ2xldCA9IHJlcXVpcmUoXCIuL2ZpZ2xldC5qc1wiKSxcbiAgZnMgPSByZXF1aXJlKFwiZnNcIiksXG4gIHBhdGggPSByZXF1aXJlKFwicGF0aFwiKSxcbiAgZm9udERpciA9IHBhdGguam9pbihfX2Rpcm5hbWUsIFwiLy4uL2ZvbnRzL1wiKTtcblxuLypcbiAgICBMb2FkcyBhIGZvbnQgaW50byB0aGUgZmlnbGV0IG9iamVjdC5cblxuICAgIFBhcmFtZXRlcnM6XG4gICAgLSBuYW1lIChzdHJpbmcpOiBOYW1lIG9mIHRoZSBmb250IHRvIGxvYWQuXG4gICAgLSBuZXh0IChmdW5jdGlvbik6IENhbGxiYWNrIGZ1bmN0aW9uLlxuKi9cbmZpZ2xldC5sb2FkRm9udCA9IGZ1bmN0aW9uIChuYW1lLCBuZXh0KSB7XG4gIGlmIChmaWdsZXQuZmlnRm9udHNbbmFtZV0pIHtcbiAgICBuZXh0KG51bGwsIGZpZ2xldC5maWdGb250c1tuYW1lXS5vcHRpb25zKTtcbiAgICByZXR1cm47XG4gIH1cblxuICBmcy5yZWFkRmlsZShcbiAgICBwYXRoLmpvaW4oZm9udERpciwgbmFtZSArIFwiLmZsZlwiKSxcbiAgICB7IGVuY29kaW5nOiBcInV0Zi04XCIgfSxcbiAgICBmdW5jdGlvbiAoZXJyLCBmb250RGF0YSkge1xuICAgICAgaWYgKGVycikge1xuICAgICAgICByZXR1cm4gbmV4dChlcnIpO1xuICAgICAgfVxuXG4gICAgICBmb250RGF0YSA9IGZvbnREYXRhICsgXCJcIjtcbiAgICAgIHRyeSB7XG4gICAgICAgIG5leHQobnVsbCwgZmlnbGV0LnBhcnNlRm9udChuYW1lLCBmb250RGF0YSkpO1xuICAgICAgfSBjYXRjaCAoZXJyb3IpIHtcbiAgICAgICAgbmV4dChlcnJvcik7XG4gICAgICB9XG4gICAgfVxuICApO1xufTtcblxuLypcbiBMb2FkcyBhIGZvbnQgc3luY2hyb25vdXNseSBpbnRvIHRoZSBmaWdsZXQgb2JqZWN0LlxuXG4gUGFyYW1ldGVyczpcbiAtIG5hbWUgKHN0cmluZyk6IE5hbWUgb2YgdGhlIGZvbnQgdG8gbG9hZC5cbiAqL1xuZmlnbGV0LmxvYWRGb250U3luYyA9IGZ1bmN0aW9uIChuYW1lKSB7XG4gIGlmIChmaWdsZXQuZmlnRm9udHNbbmFtZV0pIHtcbiAgICByZXR1cm4gZmlnbGV0LmZpZ0ZvbnRzW25hbWVdLm9wdGlvbnM7XG4gIH1cblxuICB2YXIgZm9udERhdGEgPSBmcy5yZWFkRmlsZVN5bmMocGF0aC5qb2luKGZvbnREaXIsIG5hbWUgKyBcIi5mbGZcIiksIHtcbiAgICBlbmNvZGluZzogXCJ1dGYtOFwiLFxuICB9KTtcblxuICBmb250RGF0YSA9IGZvbnREYXRhICsgXCJcIjtcbiAgcmV0dXJuIGZpZ2xldC5wYXJzZUZvbnQobmFtZSwgZm9udERhdGEpO1xufTtcblxuLypcbiAgICBSZXR1cm5zIGFuIGFycmF5IGNvbnRhaW5pbmcgYWxsIG9mIHRoZSBmb250IG5hbWVzXG4qL1xuZmlnbGV0LmZvbnRzID0gZnVuY3Rpb24gKG5leHQpIHtcbiAgdmFyIGZvbnRMaXN0ID0gW107XG4gIGZzLnJlYWRkaXIoZm9udERpciwgZnVuY3Rpb24gKGVyciwgZmlsZXMpIHtcbiAgICAvLyAnLycgZGVub3RlcyB0aGUgcm9vdCBmb2xkZXJcbiAgICBpZiAoZXJyKSB7XG4gICAgICByZXR1cm4gbmV4dChlcnIpO1xuICAgIH1cblxuICAgIGZpbGVzLmZvckVhY2goZnVuY3Rpb24gKGZpbGUpIHtcbiAgICAgIGlmICgvXFwuZmxmJC8udGVzdChmaWxlKSkge1xuICAgICAgICBmb250TGlzdC5wdXNoKGZpbGUucmVwbGFjZSgvXFwuZmxmJC8sIFwiXCIpKTtcbiAgICAgIH1cbiAgICB9KTtcblxuICAgIG5leHQobnVsbCwgZm9udExpc3QpO1xuICB9KTtcbn07XG5cbmZpZ2xldC5mb250c1N5bmMgPSBmdW5jdGlvbiAoKSB7XG4gIHZhciBmb250TGlzdCA9IFtdO1xuICBmcy5yZWFkZGlyU3luYyhmb250RGlyKS5mb3JFYWNoKGZ1bmN0aW9uIChmaWxlKSB7XG4gICAgaWYgKC9cXC5mbGYkLy50ZXN0KGZpbGUpKSB7XG4gICAgICBmb250TGlzdC5wdXNoKGZpbGUucmVwbGFjZSgvXFwuZmxmJC8sIFwiXCIpKTtcbiAgICB9XG4gIH0pO1xuXG4gIHJldHVybiBmb250TGlzdDtcbn07XG5cbm1vZHVsZS5leHBvcnRzID0gZmlnbGV0O1xuIiwiXCJ1c2Ugc3RyaWN0XCI7XG5PYmplY3QuZGVmaW5lUHJvcGVydHkoZXhwb3J0cywgXCJfX2VzTW9kdWxlXCIsIHsgdmFsdWU6IHRydWUgfSk7XG5leHBvcnRzLmV4cGFuZFZhcmlhYmxlcyA9IGV4cGFuZFZhcmlhYmxlcztcbmV4cG9ydHMucmVhZEpzb25GaWxlID0gcmVhZEpzb25GaWxlO1xuZXhwb3J0cy5sYXVuY2ggPSBsYXVuY2g7XG52YXIgZnNfMSA9IHJlcXVpcmUoXCJmc1wiKTtcbnZhciBjaGFsa18xID0gcmVxdWlyZShcImNoYWxrXCIpO1xudmFyIGNoaWxkX3Byb2Nlc3NfMSA9IHJlcXVpcmUoXCJjaGlsZF9wcm9jZXNzXCIpO1xudmFyIHN0cmlwX2pzb25fY29tbWVudHNfMSA9IHJlcXVpcmUoXCJzdHJpcC1qc29uLWNvbW1lbnRzXCIpO1xuZnVuY3Rpb24gZXhwYW5kVmFyaWFibGVzKHZhbHVlKSB7XG4gICAgaWYgKHR5cGVvZiB2YWx1ZSA9PT0gJ3N0cmluZycpIHtcbiAgICAgICAgcmV0dXJuIHZhbHVlXG4gICAgICAgICAgICAucmVwbGFjZSgvXFwkXFx7d29ya3NwYWNlUm9vdFxcfS9nLCBwcm9jZXNzLmN3ZCgpKVxuICAgICAgICAgICAgLnJlcGxhY2UoL1xcJFxce3dvcmtzcGFjZUZvbGRlclxcfS9nLCBwcm9jZXNzLmN3ZCgpKVxuICAgICAgICAgICAgLnJlcGxhY2UoL1xcJFxce2VudlxcLihcXHcrKVxcfS9nLCBmdW5jdGlvbiAobWF0Y2gsIHZhck5hbWUpIHsgcmV0dXJuIHByb2Nlc3MuZW52W3Zhck5hbWVdIHx8ICcnOyB9KTtcbiAgICB9XG4gICAgaWYgKHR5cGVvZiB2YWx1ZSA9PT0gJ29iamVjdCcgJiYgdmFsdWUgIT09IG51bGwpIHtcbiAgICAgICAgQXJyYXkuaXNBcnJheSh2YWx1ZSkgPyB2YWx1ZS5tYXAoZXhwYW5kVmFyaWFibGVzKSA6IE9iamVjdC5rZXlzKHZhbHVlKS5mb3JFYWNoKGZ1bmN0aW9uIChrZXkpIHsgcmV0dXJuIHZhbHVlW2tleV0gPSBleHBhbmRWYXJpYWJsZXModmFsdWVba2V5XSk7IH0pO1xuICAgIH1cbiAgICByZXR1cm4gdmFsdWU7XG59XG5mdW5jdGlvbiByZWFkSnNvbkZpbGUocGF0aCkge1xuICAgIHZhciBsYXVuY2hGaWxlID0gKDAsIGZzXzEucmVhZEZpbGVTeW5jKShwYXRoLCAndXRmOCcpO1xuICAgIHZhciBzdHJpcHBlZExhdW5jaEZpbGUgPSAoMCwgc3RyaXBfanNvbl9jb21tZW50c18xLmRlZmF1bHQpKGxhdW5jaEZpbGUpO1xuICAgIHZhciBsYXVuY2hDb25maWd1cmF0aW9ucyA9IEpTT04ucGFyc2Uoc3RyaXBwZWRMYXVuY2hGaWxlKTtcbiAgICByZXR1cm4gbGF1bmNoQ29uZmlndXJhdGlvbnM7XG59XG52YXIgQ09MT1JTID0gW1xuICAgIGNoYWxrXzEuZGVmYXVsdC5tYWdlbnRhLFxuICAgIGNoYWxrXzEuZGVmYXVsdC5ibHVlLFxuICAgIGNoYWxrXzEuZGVmYXVsdC5jeWFuLFxuICAgIGNoYWxrXzEuZGVmYXVsdC5ncmVlbixcbiAgICBjaGFsa18xLmRlZmF1bHQueWVsbG93LFxuICAgIGNoYWxrXzEuZGVmYXVsdC5yZWRcbl07XG5mdW5jdGlvbiBsYXVuY2gobGF1bmNoRmlsZSwgY29uZmlndXJhdGlvbk5hbWUsIGN3ZCkge1xuICAgIHZhciBfYSwgX2IsIF9jO1xuICAgIHZhciBleHBhbmRlZExhdW5jaEZpbGUgPSBleHBhbmRWYXJpYWJsZXMobGF1bmNoRmlsZSk7XG4gICAgdmFyIG5hbWVXaWR0aCA9IGV4cGFuZGVkTGF1bmNoRmlsZS5jb25maWd1cmF0aW9ucy5yZWR1Y2UoZnVuY3Rpb24gKG1heCwgY29uZmlnKSB7IHJldHVybiBNYXRoLm1heChtYXgsIGNvbmZpZy5uYW1lLmxlbmd0aCk7IH0sIDApICsgMTtcbiAgICB2YXIgY29uZmlnID0gZXhwYW5kZWRMYXVuY2hGaWxlLmNvbmZpZ3VyYXRpb25zLmZpbmQoZnVuY3Rpb24gKGNvbmZpZykgeyByZXR1cm4gY29uZmlnLm5hbWUgPT09IGNvbmZpZ3VyYXRpb25OYW1lOyB9KTtcbiAgICBpZiAoIWNvbmZpZykge1xuICAgICAgICBjb25zb2xlLmVycm9yKGNoYWxrXzEuZGVmYXVsdC5yZWQoXCJDb25maWd1cmF0aW9uIFwiLmNvbmNhdChjb25maWd1cmF0aW9uTmFtZSwgXCIgbm90IGZvdW5kXCIpKSk7XG4gICAgICAgIHJldHVybjtcbiAgICB9XG4gICAgY29uc29sZS5sb2coY2hhbGtfMS5kZWZhdWx0LmJvbGQoXCJMYXVuY2hpbmcgXCIuY29uY2F0KGNvbmZpZy5uYW1lKSkpO1xuICAgIGNvbnNvbGUubG9nKGNvbmZpZyk7XG4gICAgdmFyIGNvbG9yID0gQ09MT1JTW01hdGguZmxvb3IoTWF0aC5yYW5kb20oKSAqIENPTE9SUy5sZW5ndGgpXTtcbiAgICBjb25zb2xlLmxvZyhjb2xvcihcIkxhdW5jaGluZyBcIi5jb25jYXQoY29uZmlnLm5hbWUpKSk7XG4gICAgLy8gVE9ETzogTmVlZHMgT1Mgc3BlY2lmaWMgaGFuZGxpbmdcbiAgICB2YXIgcnVudGltZUV4ZWN1dGFibGUgPSAoKF9hID0gY29uZmlnLm9zeCkgPT09IG51bGwgfHwgX2EgPT09IHZvaWQgMCA/IHZvaWQgMCA6IF9hLnJ1bnRpbWVFeGVjdXRhYmxlKSB8fCAnJztcbiAgICB2YXIgcHJvZ3JhbSA9IGNvbmZpZy5jd2QgfHwgJy4nO1xuICAgICgwLCBjaGlsZF9wcm9jZXNzXzEuZXhlY1N5bmMpKFwiXCIuY29uY2F0KHJ1bnRpbWVFeGVjdXRhYmxlLCBcIiBcIikuY29uY2F0KCgoX2IgPSBjb25maWcucnVudGltZUFyZ3MpID09PSBudWxsIHx8IF9iID09PSB2b2lkIDAgPyB2b2lkIDAgOiBfYi5qb2luKCcgJykpIHx8ICcnLCBcIiBcIikuY29uY2F0KHByb2dyYW0sIFwiIFwiKS5jb25jYXQoKChfYyA9IGNvbmZpZy5hcmdzKSA9PT0gbnVsbCB8fCBfYyA9PT0gdm9pZCAwID8gdm9pZCAwIDogX2Muam9pbignICcpKSB8fCAnJyksIHtcbiAgICAgICAgc3RkaW86ICdpbmhlcml0JyxcbiAgICB9KTtcbn1cbiIsIm1vZHVsZS5leHBvcnRzID0gcmVxdWlyZShcImNoaWxkX3Byb2Nlc3NcIik7IiwibW9kdWxlLmV4cG9ydHMgPSByZXF1aXJlKFwiZnNcIik7IiwibW9kdWxlLmV4cG9ydHMgPSByZXF1aXJlKFwibm9kZTpjaGlsZF9wcm9jZXNzXCIpOyIsIm1vZHVsZS5leHBvcnRzID0gcmVxdWlyZShcIm5vZGU6ZXZlbnRzXCIpOyIsIm1vZHVsZS5leHBvcnRzID0gcmVxdWlyZShcIm5vZGU6ZnNcIik7IiwibW9kdWxlLmV4cG9ydHMgPSByZXF1aXJlKFwibm9kZTpvc1wiKTsiLCJtb2R1bGUuZXhwb3J0cyA9IHJlcXVpcmUoXCJub2RlOnBhdGhcIik7IiwibW9kdWxlLmV4cG9ydHMgPSByZXF1aXJlKFwibm9kZTpwcm9jZXNzXCIpOyIsIm1vZHVsZS5leHBvcnRzID0gcmVxdWlyZShcIm5vZGU6dHR5XCIpOyIsIm1vZHVsZS5leHBvcnRzID0gcmVxdWlyZShcInBhdGhcIik7IiwiY29uc3QgeyBBcmd1bWVudCB9ID0gcmVxdWlyZSgnLi9saWIvYXJndW1lbnQuanMnKTtcbmNvbnN0IHsgQ29tbWFuZCB9ID0gcmVxdWlyZSgnLi9saWIvY29tbWFuZC5qcycpO1xuY29uc3QgeyBDb21tYW5kZXJFcnJvciwgSW52YWxpZEFyZ3VtZW50RXJyb3IgfSA9IHJlcXVpcmUoJy4vbGliL2Vycm9yLmpzJyk7XG5jb25zdCB7IEhlbHAgfSA9IHJlcXVpcmUoJy4vbGliL2hlbHAuanMnKTtcbmNvbnN0IHsgT3B0aW9uIH0gPSByZXF1aXJlKCcuL2xpYi9vcHRpb24uanMnKTtcblxuZXhwb3J0cy5wcm9ncmFtID0gbmV3IENvbW1hbmQoKTtcblxuZXhwb3J0cy5jcmVhdGVDb21tYW5kID0gKG5hbWUpID0+IG5ldyBDb21tYW5kKG5hbWUpO1xuZXhwb3J0cy5jcmVhdGVPcHRpb24gPSAoZmxhZ3MsIGRlc2NyaXB0aW9uKSA9PiBuZXcgT3B0aW9uKGZsYWdzLCBkZXNjcmlwdGlvbik7XG5leHBvcnRzLmNyZWF0ZUFyZ3VtZW50ID0gKG5hbWUsIGRlc2NyaXB0aW9uKSA9PiBuZXcgQXJndW1lbnQobmFtZSwgZGVzY3JpcHRpb24pO1xuXG4vKipcbiAqIEV4cG9zZSBjbGFzc2VzXG4gKi9cblxuZXhwb3J0cy5Db21tYW5kID0gQ29tbWFuZDtcbmV4cG9ydHMuT3B0aW9uID0gT3B0aW9uO1xuZXhwb3J0cy5Bcmd1bWVudCA9IEFyZ3VtZW50O1xuZXhwb3J0cy5IZWxwID0gSGVscDtcblxuZXhwb3J0cy5Db21tYW5kZXJFcnJvciA9IENvbW1hbmRlckVycm9yO1xuZXhwb3J0cy5JbnZhbGlkQXJndW1lbnRFcnJvciA9IEludmFsaWRBcmd1bWVudEVycm9yO1xuZXhwb3J0cy5JbnZhbGlkT3B0aW9uQXJndW1lbnRFcnJvciA9IEludmFsaWRBcmd1bWVudEVycm9yOyAvLyBEZXByZWNhdGVkXG4iLCJjb25zdCB7IEludmFsaWRBcmd1bWVudEVycm9yIH0gPSByZXF1aXJlKCcuL2Vycm9yLmpzJyk7XG5cbmNsYXNzIEFyZ3VtZW50IHtcbiAgLyoqXG4gICAqIEluaXRpYWxpemUgYSBuZXcgY29tbWFuZCBhcmd1bWVudCB3aXRoIHRoZSBnaXZlbiBuYW1lIGFuZCBkZXNjcmlwdGlvbi5cbiAgICogVGhlIGRlZmF1bHQgaXMgdGhhdCB0aGUgYXJndW1lbnQgaXMgcmVxdWlyZWQsIGFuZCB5b3UgY2FuIGV4cGxpY2l0bHlcbiAgICogaW5kaWNhdGUgdGhpcyB3aXRoIDw+IGFyb3VuZCB0aGUgbmFtZS4gUHV0IFtdIGFyb3VuZCB0aGUgbmFtZSBmb3IgYW4gb3B0aW9uYWwgYXJndW1lbnQuXG4gICAqXG4gICAqIEBwYXJhbSB7c3RyaW5nfSBuYW1lXG4gICAqIEBwYXJhbSB7c3RyaW5nfSBbZGVzY3JpcHRpb25dXG4gICAqL1xuXG4gIGNvbnN0cnVjdG9yKG5hbWUsIGRlc2NyaXB0aW9uKSB7XG4gICAgdGhpcy5kZXNjcmlwdGlvbiA9IGRlc2NyaXB0aW9uIHx8ICcnO1xuICAgIHRoaXMudmFyaWFkaWMgPSBmYWxzZTtcbiAgICB0aGlzLnBhcnNlQXJnID0gdW5kZWZpbmVkO1xuICAgIHRoaXMuZGVmYXVsdFZhbHVlID0gdW5kZWZpbmVkO1xuICAgIHRoaXMuZGVmYXVsdFZhbHVlRGVzY3JpcHRpb24gPSB1bmRlZmluZWQ7XG4gICAgdGhpcy5hcmdDaG9pY2VzID0gdW5kZWZpbmVkO1xuXG4gICAgc3dpdGNoIChuYW1lWzBdKSB7XG4gICAgICBjYXNlICc8JzogLy8gZS5nLiA8cmVxdWlyZWQ+XG4gICAgICAgIHRoaXMucmVxdWlyZWQgPSB0cnVlO1xuICAgICAgICB0aGlzLl9uYW1lID0gbmFtZS5zbGljZSgxLCAtMSk7XG4gICAgICAgIGJyZWFrO1xuICAgICAgY2FzZSAnWyc6IC8vIGUuZy4gW29wdGlvbmFsXVxuICAgICAgICB0aGlzLnJlcXVpcmVkID0gZmFsc2U7XG4gICAgICAgIHRoaXMuX25hbWUgPSBuYW1lLnNsaWNlKDEsIC0xKTtcbiAgICAgICAgYnJlYWs7XG4gICAgICBkZWZhdWx0OlxuICAgICAgICB0aGlzLnJlcXVpcmVkID0gdHJ1ZTtcbiAgICAgICAgdGhpcy5fbmFtZSA9IG5hbWU7XG4gICAgICAgIGJyZWFrO1xuICAgIH1cblxuICAgIGlmICh0aGlzLl9uYW1lLmxlbmd0aCA+IDMgJiYgdGhpcy5fbmFtZS5zbGljZSgtMykgPT09ICcuLi4nKSB7XG4gICAgICB0aGlzLnZhcmlhZGljID0gdHJ1ZTtcbiAgICAgIHRoaXMuX25hbWUgPSB0aGlzLl9uYW1lLnNsaWNlKDAsIC0zKTtcbiAgICB9XG4gIH1cblxuICAvKipcbiAgICogUmV0dXJuIGFyZ3VtZW50IG5hbWUuXG4gICAqXG4gICAqIEByZXR1cm4ge3N0cmluZ31cbiAgICovXG5cbiAgbmFtZSgpIHtcbiAgICByZXR1cm4gdGhpcy5fbmFtZTtcbiAgfVxuXG4gIC8qKlxuICAgKiBAcGFja2FnZVxuICAgKi9cblxuICBfY29uY2F0VmFsdWUodmFsdWUsIHByZXZpb3VzKSB7XG4gICAgaWYgKHByZXZpb3VzID09PSB0aGlzLmRlZmF1bHRWYWx1ZSB8fCAhQXJyYXkuaXNBcnJheShwcmV2aW91cykpIHtcbiAgICAgIHJldHVybiBbdmFsdWVdO1xuICAgIH1cblxuICAgIHJldHVybiBwcmV2aW91cy5jb25jYXQodmFsdWUpO1xuICB9XG5cbiAgLyoqXG4gICAqIFNldCB0aGUgZGVmYXVsdCB2YWx1ZSwgYW5kIG9wdGlvbmFsbHkgc3VwcGx5IHRoZSBkZXNjcmlwdGlvbiB0byBiZSBkaXNwbGF5ZWQgaW4gdGhlIGhlbHAuXG4gICAqXG4gICAqIEBwYXJhbSB7Kn0gdmFsdWVcbiAgICogQHBhcmFtIHtzdHJpbmd9IFtkZXNjcmlwdGlvbl1cbiAgICogQHJldHVybiB7QXJndW1lbnR9XG4gICAqL1xuXG4gIGRlZmF1bHQodmFsdWUsIGRlc2NyaXB0aW9uKSB7XG4gICAgdGhpcy5kZWZhdWx0VmFsdWUgPSB2YWx1ZTtcbiAgICB0aGlzLmRlZmF1bHRWYWx1ZURlc2NyaXB0aW9uID0gZGVzY3JpcHRpb247XG4gICAgcmV0dXJuIHRoaXM7XG4gIH1cblxuICAvKipcbiAgICogU2V0IHRoZSBjdXN0b20gaGFuZGxlciBmb3IgcHJvY2Vzc2luZyBDTEkgY29tbWFuZCBhcmd1bWVudHMgaW50byBhcmd1bWVudCB2YWx1ZXMuXG4gICAqXG4gICAqIEBwYXJhbSB7RnVuY3Rpb259IFtmbl1cbiAgICogQHJldHVybiB7QXJndW1lbnR9XG4gICAqL1xuXG4gIGFyZ1BhcnNlcihmbikge1xuICAgIHRoaXMucGFyc2VBcmcgPSBmbjtcbiAgICByZXR1cm4gdGhpcztcbiAgfVxuXG4gIC8qKlxuICAgKiBPbmx5IGFsbG93IGFyZ3VtZW50IHZhbHVlIHRvIGJlIG9uZSBvZiBjaG9pY2VzLlxuICAgKlxuICAgKiBAcGFyYW0ge3N0cmluZ1tdfSB2YWx1ZXNcbiAgICogQHJldHVybiB7QXJndW1lbnR9XG4gICAqL1xuXG4gIGNob2ljZXModmFsdWVzKSB7XG4gICAgdGhpcy5hcmdDaG9pY2VzID0gdmFsdWVzLnNsaWNlKCk7XG4gICAgdGhpcy5wYXJzZUFyZyA9IChhcmcsIHByZXZpb3VzKSA9PiB7XG4gICAgICBpZiAoIXRoaXMuYXJnQ2hvaWNlcy5pbmNsdWRlcyhhcmcpKSB7XG4gICAgICAgIHRocm93IG5ldyBJbnZhbGlkQXJndW1lbnRFcnJvcihcbiAgICAgICAgICBgQWxsb3dlZCBjaG9pY2VzIGFyZSAke3RoaXMuYXJnQ2hvaWNlcy5qb2luKCcsICcpfS5gLFxuICAgICAgICApO1xuICAgICAgfVxuICAgICAgaWYgKHRoaXMudmFyaWFkaWMpIHtcbiAgICAgICAgcmV0dXJuIHRoaXMuX2NvbmNhdFZhbHVlKGFyZywgcHJldmlvdXMpO1xuICAgICAgfVxuICAgICAgcmV0dXJuIGFyZztcbiAgICB9O1xuICAgIHJldHVybiB0aGlzO1xuICB9XG5cbiAgLyoqXG4gICAqIE1ha2UgYXJndW1lbnQgcmVxdWlyZWQuXG4gICAqXG4gICAqIEByZXR1cm5zIHtBcmd1bWVudH1cbiAgICovXG4gIGFyZ1JlcXVpcmVkKCkge1xuICAgIHRoaXMucmVxdWlyZWQgPSB0cnVlO1xuICAgIHJldHVybiB0aGlzO1xuICB9XG5cbiAgLyoqXG4gICAqIE1ha2UgYXJndW1lbnQgb3B0aW9uYWwuXG4gICAqXG4gICAqIEByZXR1cm5zIHtBcmd1bWVudH1cbiAgICovXG4gIGFyZ09wdGlvbmFsKCkge1xuICAgIHRoaXMucmVxdWlyZWQgPSBmYWxzZTtcbiAgICByZXR1cm4gdGhpcztcbiAgfVxufVxuXG4vKipcbiAqIFRha2VzIGFuIGFyZ3VtZW50IGFuZCByZXR1cm5zIGl0cyBodW1hbiByZWFkYWJsZSBlcXVpdmFsZW50IGZvciBoZWxwIHVzYWdlLlxuICpcbiAqIEBwYXJhbSB7QXJndW1lbnR9IGFyZ1xuICogQHJldHVybiB7c3RyaW5nfVxuICogQHByaXZhdGVcbiAqL1xuXG5mdW5jdGlvbiBodW1hblJlYWRhYmxlQXJnTmFtZShhcmcpIHtcbiAgY29uc3QgbmFtZU91dHB1dCA9IGFyZy5uYW1lKCkgKyAoYXJnLnZhcmlhZGljID09PSB0cnVlID8gJy4uLicgOiAnJyk7XG5cbiAgcmV0dXJuIGFyZy5yZXF1aXJlZCA/ICc8JyArIG5hbWVPdXRwdXQgKyAnPicgOiAnWycgKyBuYW1lT3V0cHV0ICsgJ10nO1xufVxuXG5leHBvcnRzLkFyZ3VtZW50ID0gQXJndW1lbnQ7XG5leHBvcnRzLmh1bWFuUmVhZGFibGVBcmdOYW1lID0gaHVtYW5SZWFkYWJsZUFyZ05hbWU7XG4iLCJjb25zdCBFdmVudEVtaXR0ZXIgPSByZXF1aXJlKCdub2RlOmV2ZW50cycpLkV2ZW50RW1pdHRlcjtcbmNvbnN0IGNoaWxkUHJvY2VzcyA9IHJlcXVpcmUoJ25vZGU6Y2hpbGRfcHJvY2VzcycpO1xuY29uc3QgcGF0aCA9IHJlcXVpcmUoJ25vZGU6cGF0aCcpO1xuY29uc3QgZnMgPSByZXF1aXJlKCdub2RlOmZzJyk7XG5jb25zdCBwcm9jZXNzID0gcmVxdWlyZSgnbm9kZTpwcm9jZXNzJyk7XG5cbmNvbnN0IHsgQXJndW1lbnQsIGh1bWFuUmVhZGFibGVBcmdOYW1lIH0gPSByZXF1aXJlKCcuL2FyZ3VtZW50LmpzJyk7XG5jb25zdCB7IENvbW1hbmRlckVycm9yIH0gPSByZXF1aXJlKCcuL2Vycm9yLmpzJyk7XG5jb25zdCB7IEhlbHAgfSA9IHJlcXVpcmUoJy4vaGVscC5qcycpO1xuY29uc3QgeyBPcHRpb24sIER1YWxPcHRpb25zIH0gPSByZXF1aXJlKCcuL29wdGlvbi5qcycpO1xuY29uc3QgeyBzdWdnZXN0U2ltaWxhciB9ID0gcmVxdWlyZSgnLi9zdWdnZXN0U2ltaWxhcicpO1xuXG5jbGFzcyBDb21tYW5kIGV4dGVuZHMgRXZlbnRFbWl0dGVyIHtcbiAgLyoqXG4gICAqIEluaXRpYWxpemUgYSBuZXcgYENvbW1hbmRgLlxuICAgKlxuICAgKiBAcGFyYW0ge3N0cmluZ30gW25hbWVdXG4gICAqL1xuXG4gIGNvbnN0cnVjdG9yKG5hbWUpIHtcbiAgICBzdXBlcigpO1xuICAgIC8qKiBAdHlwZSB7Q29tbWFuZFtdfSAqL1xuICAgIHRoaXMuY29tbWFuZHMgPSBbXTtcbiAgICAvKiogQHR5cGUge09wdGlvbltdfSAqL1xuICAgIHRoaXMub3B0aW9ucyA9IFtdO1xuICAgIHRoaXMucGFyZW50ID0gbnVsbDtcbiAgICB0aGlzLl9hbGxvd1Vua25vd25PcHRpb24gPSBmYWxzZTtcbiAgICB0aGlzLl9hbGxvd0V4Y2Vzc0FyZ3VtZW50cyA9IHRydWU7XG4gICAgLyoqIEB0eXBlIHtBcmd1bWVudFtdfSAqL1xuICAgIHRoaXMucmVnaXN0ZXJlZEFyZ3VtZW50cyA9IFtdO1xuICAgIHRoaXMuX2FyZ3MgPSB0aGlzLnJlZ2lzdGVyZWRBcmd1bWVudHM7IC8vIGRlcHJlY2F0ZWQgb2xkIG5hbWVcbiAgICAvKiogQHR5cGUge3N0cmluZ1tdfSAqL1xuICAgIHRoaXMuYXJncyA9IFtdOyAvLyBjbGkgYXJncyB3aXRoIG9wdGlvbnMgcmVtb3ZlZFxuICAgIHRoaXMucmF3QXJncyA9IFtdO1xuICAgIHRoaXMucHJvY2Vzc2VkQXJncyA9IFtdOyAvLyBsaWtlIC5hcmdzIGJ1dCBhZnRlciBjdXN0b20gcHJvY2Vzc2luZyBhbmQgY29sbGVjdGluZyB2YXJpYWRpY1xuICAgIHRoaXMuX3NjcmlwdFBhdGggPSBudWxsO1xuICAgIHRoaXMuX25hbWUgPSBuYW1lIHx8ICcnO1xuICAgIHRoaXMuX29wdGlvblZhbHVlcyA9IHt9O1xuICAgIHRoaXMuX29wdGlvblZhbHVlU291cmNlcyA9IHt9OyAvLyBkZWZhdWx0LCBlbnYsIGNsaSBldGNcbiAgICB0aGlzLl9zdG9yZU9wdGlvbnNBc1Byb3BlcnRpZXMgPSBmYWxzZTtcbiAgICB0aGlzLl9hY3Rpb25IYW5kbGVyID0gbnVsbDtcbiAgICB0aGlzLl9leGVjdXRhYmxlSGFuZGxlciA9IGZhbHNlO1xuICAgIHRoaXMuX2V4ZWN1dGFibGVGaWxlID0gbnVsbDsgLy8gY3VzdG9tIG5hbWUgZm9yIGV4ZWN1dGFibGVcbiAgICB0aGlzLl9leGVjdXRhYmxlRGlyID0gbnVsbDsgLy8gY3VzdG9tIHNlYXJjaCBkaXJlY3RvcnkgZm9yIHN1YmNvbW1hbmRzXG4gICAgdGhpcy5fZGVmYXVsdENvbW1hbmROYW1lID0gbnVsbDtcbiAgICB0aGlzLl9leGl0Q2FsbGJhY2sgPSBudWxsO1xuICAgIHRoaXMuX2FsaWFzZXMgPSBbXTtcbiAgICB0aGlzLl9jb21iaW5lRmxhZ0FuZE9wdGlvbmFsVmFsdWUgPSB0cnVlO1xuICAgIHRoaXMuX2Rlc2NyaXB0aW9uID0gJyc7XG4gICAgdGhpcy5fc3VtbWFyeSA9ICcnO1xuICAgIHRoaXMuX2FyZ3NEZXNjcmlwdGlvbiA9IHVuZGVmaW5lZDsgLy8gbGVnYWN5XG4gICAgdGhpcy5fZW5hYmxlUG9zaXRpb25hbE9wdGlvbnMgPSBmYWxzZTtcbiAgICB0aGlzLl9wYXNzVGhyb3VnaE9wdGlvbnMgPSBmYWxzZTtcbiAgICB0aGlzLl9saWZlQ3ljbGVIb29rcyA9IHt9OyAvLyBhIGhhc2ggb2YgYXJyYXlzXG4gICAgLyoqIEB0eXBlIHsoYm9vbGVhbiB8IHN0cmluZyl9ICovXG4gICAgdGhpcy5fc2hvd0hlbHBBZnRlckVycm9yID0gZmFsc2U7XG4gICAgdGhpcy5fc2hvd1N1Z2dlc3Rpb25BZnRlckVycm9yID0gdHJ1ZTtcblxuICAgIC8vIHNlZSAuY29uZmlndXJlT3V0cHV0KCkgZm9yIGRvY3NcbiAgICB0aGlzLl9vdXRwdXRDb25maWd1cmF0aW9uID0ge1xuICAgICAgd3JpdGVPdXQ6IChzdHIpID0+IHByb2Nlc3Muc3Rkb3V0LndyaXRlKHN0ciksXG4gICAgICB3cml0ZUVycjogKHN0cikgPT4gcHJvY2Vzcy5zdGRlcnIud3JpdGUoc3RyKSxcbiAgICAgIGdldE91dEhlbHBXaWR0aDogKCkgPT5cbiAgICAgICAgcHJvY2Vzcy5zdGRvdXQuaXNUVFkgPyBwcm9jZXNzLnN0ZG91dC5jb2x1bW5zIDogdW5kZWZpbmVkLFxuICAgICAgZ2V0RXJySGVscFdpZHRoOiAoKSA9PlxuICAgICAgICBwcm9jZXNzLnN0ZGVyci5pc1RUWSA/IHByb2Nlc3Muc3RkZXJyLmNvbHVtbnMgOiB1bmRlZmluZWQsXG4gICAgICBvdXRwdXRFcnJvcjogKHN0ciwgd3JpdGUpID0+IHdyaXRlKHN0ciksXG4gICAgfTtcblxuICAgIHRoaXMuX2hpZGRlbiA9IGZhbHNlO1xuICAgIC8qKiBAdHlwZSB7KE9wdGlvbiB8IG51bGwgfCB1bmRlZmluZWQpfSAqL1xuICAgIHRoaXMuX2hlbHBPcHRpb24gPSB1bmRlZmluZWQ7IC8vIExhenkgY3JlYXRlZCBvbiBkZW1hbmQuIE1heSBiZSBudWxsIGlmIGhlbHAgb3B0aW9uIGlzIGRpc2FibGVkLlxuICAgIHRoaXMuX2FkZEltcGxpY2l0SGVscENvbW1hbmQgPSB1bmRlZmluZWQ7IC8vIHVuZGVjaWRlZCB3aGV0aGVyIHRydWUgb3IgZmFsc2UgeWV0LCBub3QgaW5oZXJpdGVkXG4gICAgLyoqIEB0eXBlIHtDb21tYW5kfSAqL1xuICAgIHRoaXMuX2hlbHBDb21tYW5kID0gdW5kZWZpbmVkOyAvLyBsYXp5IGluaXRpYWxpc2VkLCBpbmhlcml0ZWRcbiAgICB0aGlzLl9oZWxwQ29uZmlndXJhdGlvbiA9IHt9O1xuICB9XG5cbiAgLyoqXG4gICAqIENvcHkgc2V0dGluZ3MgdGhhdCBhcmUgdXNlZnVsIHRvIGhhdmUgaW4gY29tbW9uIGFjcm9zcyByb290IGNvbW1hbmQgYW5kIHN1YmNvbW1hbmRzLlxuICAgKlxuICAgKiAoVXNlZCBpbnRlcm5hbGx5IHdoZW4gYWRkaW5nIGEgY29tbWFuZCB1c2luZyBgLmNvbW1hbmQoKWAgc28gc3ViY29tbWFuZHMgaW5oZXJpdCBwYXJlbnQgc2V0dGluZ3MuKVxuICAgKlxuICAgKiBAcGFyYW0ge0NvbW1hbmR9IHNvdXJjZUNvbW1hbmRcbiAgICogQHJldHVybiB7Q29tbWFuZH0gYHRoaXNgIGNvbW1hbmQgZm9yIGNoYWluaW5nXG4gICAqL1xuICBjb3B5SW5oZXJpdGVkU2V0dGluZ3Moc291cmNlQ29tbWFuZCkge1xuICAgIHRoaXMuX291dHB1dENvbmZpZ3VyYXRpb24gPSBzb3VyY2VDb21tYW5kLl9vdXRwdXRDb25maWd1cmF0aW9uO1xuICAgIHRoaXMuX2hlbHBPcHRpb24gPSBzb3VyY2VDb21tYW5kLl9oZWxwT3B0aW9uO1xuICAgIHRoaXMuX2hlbHBDb21tYW5kID0gc291cmNlQ29tbWFuZC5faGVscENvbW1hbmQ7XG4gICAgdGhpcy5faGVscENvbmZpZ3VyYXRpb24gPSBzb3VyY2VDb21tYW5kLl9oZWxwQ29uZmlndXJhdGlvbjtcbiAgICB0aGlzLl9leGl0Q2FsbGJhY2sgPSBzb3VyY2VDb21tYW5kLl9leGl0Q2FsbGJhY2s7XG4gICAgdGhpcy5fc3RvcmVPcHRpb25zQXNQcm9wZXJ0aWVzID0gc291cmNlQ29tbWFuZC5fc3RvcmVPcHRpb25zQXNQcm9wZXJ0aWVzO1xuICAgIHRoaXMuX2NvbWJpbmVGbGFnQW5kT3B0aW9uYWxWYWx1ZSA9XG4gICAgICBzb3VyY2VDb21tYW5kLl9jb21iaW5lRmxhZ0FuZE9wdGlvbmFsVmFsdWU7XG4gICAgdGhpcy5fYWxsb3dFeGNlc3NBcmd1bWVudHMgPSBzb3VyY2VDb21tYW5kLl9hbGxvd0V4Y2Vzc0FyZ3VtZW50cztcbiAgICB0aGlzLl9lbmFibGVQb3NpdGlvbmFsT3B0aW9ucyA9IHNvdXJjZUNvbW1hbmQuX2VuYWJsZVBvc2l0aW9uYWxPcHRpb25zO1xuICAgIHRoaXMuX3Nob3dIZWxwQWZ0ZXJFcnJvciA9IHNvdXJjZUNvbW1hbmQuX3Nob3dIZWxwQWZ0ZXJFcnJvcjtcbiAgICB0aGlzLl9zaG93U3VnZ2VzdGlvbkFmdGVyRXJyb3IgPSBzb3VyY2VDb21tYW5kLl9zaG93U3VnZ2VzdGlvbkFmdGVyRXJyb3I7XG5cbiAgICByZXR1cm4gdGhpcztcbiAgfVxuXG4gIC8qKlxuICAgKiBAcmV0dXJucyB7Q29tbWFuZFtdfVxuICAgKiBAcHJpdmF0ZVxuICAgKi9cblxuICBfZ2V0Q29tbWFuZEFuZEFuY2VzdG9ycygpIHtcbiAgICBjb25zdCByZXN1bHQgPSBbXTtcbiAgICAvLyBlc2xpbnQtZGlzYWJsZS1uZXh0LWxpbmUgQHR5cGVzY3JpcHQtZXNsaW50L25vLXRoaXMtYWxpYXNcbiAgICBmb3IgKGxldCBjb21tYW5kID0gdGhpczsgY29tbWFuZDsgY29tbWFuZCA9IGNvbW1hbmQucGFyZW50KSB7XG4gICAgICByZXN1bHQucHVzaChjb21tYW5kKTtcbiAgICB9XG4gICAgcmV0dXJuIHJlc3VsdDtcbiAgfVxuXG4gIC8qKlxuICAgKiBEZWZpbmUgYSBjb21tYW5kLlxuICAgKlxuICAgKiBUaGVyZSBhcmUgdHdvIHN0eWxlcyBvZiBjb21tYW5kOiBwYXkgYXR0ZW50aW9uIHRvIHdoZXJlIHRvIHB1dCB0aGUgZGVzY3JpcHRpb24uXG4gICAqXG4gICAqIEBleGFtcGxlXG4gICAqIC8vIENvbW1hbmQgaW1wbGVtZW50ZWQgdXNpbmcgYWN0aW9uIGhhbmRsZXIgKGRlc2NyaXB0aW9uIGlzIHN1cHBsaWVkIHNlcGFyYXRlbHkgdG8gYC5jb21tYW5kYClcbiAgICogcHJvZ3JhbVxuICAgKiAgIC5jb21tYW5kKCdjbG9uZSA8c291cmNlPiBbZGVzdGluYXRpb25dJylcbiAgICogICAuZGVzY3JpcHRpb24oJ2Nsb25lIGEgcmVwb3NpdG9yeSBpbnRvIGEgbmV3bHkgY3JlYXRlZCBkaXJlY3RvcnknKVxuICAgKiAgIC5hY3Rpb24oKHNvdXJjZSwgZGVzdGluYXRpb24pID0+IHtcbiAgICogICAgIGNvbnNvbGUubG9nKCdjbG9uZSBjb21tYW5kIGNhbGxlZCcpO1xuICAgKiAgIH0pO1xuICAgKlxuICAgKiAvLyBDb21tYW5kIGltcGxlbWVudGVkIHVzaW5nIHNlcGFyYXRlIGV4ZWN1dGFibGUgZmlsZSAoZGVzY3JpcHRpb24gaXMgc2Vjb25kIHBhcmFtZXRlciB0byBgLmNvbW1hbmRgKVxuICAgKiBwcm9ncmFtXG4gICAqICAgLmNvbW1hbmQoJ3N0YXJ0IDxzZXJ2aWNlPicsICdzdGFydCBuYW1lZCBzZXJ2aWNlJylcbiAgICogICAuY29tbWFuZCgnc3RvcCBbc2VydmljZV0nLCAnc3RvcCBuYW1lZCBzZXJ2aWNlLCBvciBhbGwgaWYgbm8gbmFtZSBzdXBwbGllZCcpO1xuICAgKlxuICAgKiBAcGFyYW0ge3N0cmluZ30gbmFtZUFuZEFyZ3MgLSBjb21tYW5kIG5hbWUgYW5kIGFyZ3VtZW50cywgYXJncyBhcmUgYDxyZXF1aXJlZD5gIG9yIGBbb3B0aW9uYWxdYCBhbmQgbGFzdCBtYXkgYWxzbyBiZSBgdmFyaWFkaWMuLi5gXG4gICAqIEBwYXJhbSB7KG9iamVjdCB8IHN0cmluZyl9IFthY3Rpb25PcHRzT3JFeGVjRGVzY10gLSBjb25maWd1cmF0aW9uIG9wdGlvbnMgKGZvciBhY3Rpb24pLCBvciBkZXNjcmlwdGlvbiAoZm9yIGV4ZWN1dGFibGUpXG4gICAqIEBwYXJhbSB7b2JqZWN0fSBbZXhlY09wdHNdIC0gY29uZmlndXJhdGlvbiBvcHRpb25zIChmb3IgZXhlY3V0YWJsZSlcbiAgICogQHJldHVybiB7Q29tbWFuZH0gcmV0dXJucyBuZXcgY29tbWFuZCBmb3IgYWN0aW9uIGhhbmRsZXIsIG9yIGB0aGlzYCBmb3IgZXhlY3V0YWJsZSBjb21tYW5kXG4gICAqL1xuXG4gIGNvbW1hbmQobmFtZUFuZEFyZ3MsIGFjdGlvbk9wdHNPckV4ZWNEZXNjLCBleGVjT3B0cykge1xuICAgIGxldCBkZXNjID0gYWN0aW9uT3B0c09yRXhlY0Rlc2M7XG4gICAgbGV0IG9wdHMgPSBleGVjT3B0cztcbiAgICBpZiAodHlwZW9mIGRlc2MgPT09ICdvYmplY3QnICYmIGRlc2MgIT09IG51bGwpIHtcbiAgICAgIG9wdHMgPSBkZXNjO1xuICAgICAgZGVzYyA9IG51bGw7XG4gICAgfVxuICAgIG9wdHMgPSBvcHRzIHx8IHt9O1xuICAgIGNvbnN0IFssIG5hbWUsIGFyZ3NdID0gbmFtZUFuZEFyZ3MubWF0Y2goLyhbXiBdKykgKiguKikvKTtcblxuICAgIGNvbnN0IGNtZCA9IHRoaXMuY3JlYXRlQ29tbWFuZChuYW1lKTtcbiAgICBpZiAoZGVzYykge1xuICAgICAgY21kLmRlc2NyaXB0aW9uKGRlc2MpO1xuICAgICAgY21kLl9leGVjdXRhYmxlSGFuZGxlciA9IHRydWU7XG4gICAgfVxuICAgIGlmIChvcHRzLmlzRGVmYXVsdCkgdGhpcy5fZGVmYXVsdENvbW1hbmROYW1lID0gY21kLl9uYW1lO1xuICAgIGNtZC5faGlkZGVuID0gISEob3B0cy5ub0hlbHAgfHwgb3B0cy5oaWRkZW4pOyAvLyBub0hlbHAgaXMgZGVwcmVjYXRlZCBvbGQgbmFtZSBmb3IgaGlkZGVuXG4gICAgY21kLl9leGVjdXRhYmxlRmlsZSA9IG9wdHMuZXhlY3V0YWJsZUZpbGUgfHwgbnVsbDsgLy8gQ3VzdG9tIG5hbWUgZm9yIGV4ZWN1dGFibGUgZmlsZSwgc2V0IG1pc3NpbmcgdG8gbnVsbCB0byBtYXRjaCBjb25zdHJ1Y3RvclxuICAgIGlmIChhcmdzKSBjbWQuYXJndW1lbnRzKGFyZ3MpO1xuICAgIHRoaXMuX3JlZ2lzdGVyQ29tbWFuZChjbWQpO1xuICAgIGNtZC5wYXJlbnQgPSB0aGlzO1xuICAgIGNtZC5jb3B5SW5oZXJpdGVkU2V0dGluZ3ModGhpcyk7XG5cbiAgICBpZiAoZGVzYykgcmV0dXJuIHRoaXM7XG4gICAgcmV0dXJuIGNtZDtcbiAgfVxuXG4gIC8qKlxuICAgKiBGYWN0b3J5IHJvdXRpbmUgdG8gY3JlYXRlIGEgbmV3IHVuYXR0YWNoZWQgY29tbWFuZC5cbiAgICpcbiAgICogU2VlIC5jb21tYW5kKCkgZm9yIGNyZWF0aW5nIGFuIGF0dGFjaGVkIHN1YmNvbW1hbmQsIHdoaWNoIHVzZXMgdGhpcyByb3V0aW5lIHRvXG4gICAqIGNyZWF0ZSB0aGUgY29tbWFuZC4gWW91IGNhbiBvdmVycmlkZSBjcmVhdGVDb21tYW5kIHRvIGN1c3RvbWlzZSBzdWJjb21tYW5kcy5cbiAgICpcbiAgICogQHBhcmFtIHtzdHJpbmd9IFtuYW1lXVxuICAgKiBAcmV0dXJuIHtDb21tYW5kfSBuZXcgY29tbWFuZFxuICAgKi9cblxuICBjcmVhdGVDb21tYW5kKG5hbWUpIHtcbiAgICByZXR1cm4gbmV3IENvbW1hbmQobmFtZSk7XG4gIH1cblxuICAvKipcbiAgICogWW91IGNhbiBjdXN0b21pc2UgdGhlIGhlbHAgd2l0aCBhIHN1YmNsYXNzIG9mIEhlbHAgYnkgb3ZlcnJpZGluZyBjcmVhdGVIZWxwLFxuICAgKiBvciBieSBvdmVycmlkaW5nIEhlbHAgcHJvcGVydGllcyB1c2luZyBjb25maWd1cmVIZWxwKCkuXG4gICAqXG4gICAqIEByZXR1cm4ge0hlbHB9XG4gICAqL1xuXG4gIGNyZWF0ZUhlbHAoKSB7XG4gICAgcmV0dXJuIE9iamVjdC5hc3NpZ24obmV3IEhlbHAoKSwgdGhpcy5jb25maWd1cmVIZWxwKCkpO1xuICB9XG5cbiAgLyoqXG4gICAqIFlvdSBjYW4gY3VzdG9taXNlIHRoZSBoZWxwIGJ5IG92ZXJyaWRpbmcgSGVscCBwcm9wZXJ0aWVzIHVzaW5nIGNvbmZpZ3VyZUhlbHAoKSxcbiAgICogb3Igd2l0aCBhIHN1YmNsYXNzIG9mIEhlbHAgYnkgb3ZlcnJpZGluZyBjcmVhdGVIZWxwKCkuXG4gICAqXG4gICAqIEBwYXJhbSB7b2JqZWN0fSBbY29uZmlndXJhdGlvbl0gLSBjb25maWd1cmF0aW9uIG9wdGlvbnNcbiAgICogQHJldHVybiB7KENvbW1hbmQgfCBvYmplY3QpfSBgdGhpc2AgY29tbWFuZCBmb3IgY2hhaW5pbmcsIG9yIHN0b3JlZCBjb25maWd1cmF0aW9uXG4gICAqL1xuXG4gIGNvbmZpZ3VyZUhlbHAoY29uZmlndXJhdGlvbikge1xuICAgIGlmIChjb25maWd1cmF0aW9uID09PSB1bmRlZmluZWQpIHJldHVybiB0aGlzLl9oZWxwQ29uZmlndXJhdGlvbjtcblxuICAgIHRoaXMuX2hlbHBDb25maWd1cmF0aW9uID0gY29uZmlndXJhdGlvbjtcbiAgICByZXR1cm4gdGhpcztcbiAgfVxuXG4gIC8qKlxuICAgKiBUaGUgZGVmYXVsdCBvdXRwdXQgZ29lcyB0byBzdGRvdXQgYW5kIHN0ZGVyci4gWW91IGNhbiBjdXN0b21pc2UgdGhpcyBmb3Igc3BlY2lhbFxuICAgKiBhcHBsaWNhdGlvbnMuIFlvdSBjYW4gYWxzbyBjdXN0b21pc2UgdGhlIGRpc3BsYXkgb2YgZXJyb3JzIGJ5IG92ZXJyaWRpbmcgb3V0cHV0RXJyb3IuXG4gICAqXG4gICAqIFRoZSBjb25maWd1cmF0aW9uIHByb3BlcnRpZXMgYXJlIGFsbCBmdW5jdGlvbnM6XG4gICAqXG4gICAqICAgICAvLyBmdW5jdGlvbnMgdG8gY2hhbmdlIHdoZXJlIGJlaW5nIHdyaXR0ZW4sIHN0ZG91dCBhbmQgc3RkZXJyXG4gICAqICAgICB3cml0ZU91dChzdHIpXG4gICAqICAgICB3cml0ZUVycihzdHIpXG4gICAqICAgICAvLyBtYXRjaGluZyBmdW5jdGlvbnMgdG8gc3BlY2lmeSB3aWR0aCBmb3Igd3JhcHBpbmcgaGVscFxuICAgKiAgICAgZ2V0T3V0SGVscFdpZHRoKClcbiAgICogICAgIGdldEVyckhlbHBXaWR0aCgpXG4gICAqICAgICAvLyBmdW5jdGlvbnMgYmFzZWQgb24gd2hhdCBpcyBiZWluZyB3cml0dGVuIG91dFxuICAgKiAgICAgb3V0cHV0RXJyb3Ioc3RyLCB3cml0ZSkgLy8gdXNlZCBmb3IgZGlzcGxheWluZyBlcnJvcnMsIGFuZCBub3QgdXNlZCBmb3IgZGlzcGxheWluZyBoZWxwXG4gICAqXG4gICAqIEBwYXJhbSB7b2JqZWN0fSBbY29uZmlndXJhdGlvbl0gLSBjb25maWd1cmF0aW9uIG9wdGlvbnNcbiAgICogQHJldHVybiB7KENvbW1hbmQgfCBvYmplY3QpfSBgdGhpc2AgY29tbWFuZCBmb3IgY2hhaW5pbmcsIG9yIHN0b3JlZCBjb25maWd1cmF0aW9uXG4gICAqL1xuXG4gIGNvbmZpZ3VyZU91dHB1dChjb25maWd1cmF0aW9uKSB7XG4gICAgaWYgKGNvbmZpZ3VyYXRpb24gPT09IHVuZGVmaW5lZCkgcmV0dXJuIHRoaXMuX291dHB1dENvbmZpZ3VyYXRpb247XG5cbiAgICBPYmplY3QuYXNzaWduKHRoaXMuX291dHB1dENvbmZpZ3VyYXRpb24sIGNvbmZpZ3VyYXRpb24pO1xuICAgIHJldHVybiB0aGlzO1xuICB9XG5cbiAgLyoqXG4gICAqIERpc3BsYXkgdGhlIGhlbHAgb3IgYSBjdXN0b20gbWVzc2FnZSBhZnRlciBhbiBlcnJvciBvY2N1cnMuXG4gICAqXG4gICAqIEBwYXJhbSB7KGJvb2xlYW58c3RyaW5nKX0gW2Rpc3BsYXlIZWxwXVxuICAgKiBAcmV0dXJuIHtDb21tYW5kfSBgdGhpc2AgY29tbWFuZCBmb3IgY2hhaW5pbmdcbiAgICovXG4gIHNob3dIZWxwQWZ0ZXJFcnJvcihkaXNwbGF5SGVscCA9IHRydWUpIHtcbiAgICBpZiAodHlwZW9mIGRpc3BsYXlIZWxwICE9PSAnc3RyaW5nJykgZGlzcGxheUhlbHAgPSAhIWRpc3BsYXlIZWxwO1xuICAgIHRoaXMuX3Nob3dIZWxwQWZ0ZXJFcnJvciA9IGRpc3BsYXlIZWxwO1xuICAgIHJldHVybiB0aGlzO1xuICB9XG5cbiAgLyoqXG4gICAqIERpc3BsYXkgc3VnZ2VzdGlvbiBvZiBzaW1pbGFyIGNvbW1hbmRzIGZvciB1bmtub3duIGNvbW1hbmRzLCBvciBvcHRpb25zIGZvciB1bmtub3duIG9wdGlvbnMuXG4gICAqXG4gICAqIEBwYXJhbSB7Ym9vbGVhbn0gW2Rpc3BsYXlTdWdnZXN0aW9uXVxuICAgKiBAcmV0dXJuIHtDb21tYW5kfSBgdGhpc2AgY29tbWFuZCBmb3IgY2hhaW5pbmdcbiAgICovXG4gIHNob3dTdWdnZXN0aW9uQWZ0ZXJFcnJvcihkaXNwbGF5U3VnZ2VzdGlvbiA9IHRydWUpIHtcbiAgICB0aGlzLl9zaG93U3VnZ2VzdGlvbkFmdGVyRXJyb3IgPSAhIWRpc3BsYXlTdWdnZXN0aW9uO1xuICAgIHJldHVybiB0aGlzO1xuICB9XG5cbiAgLyoqXG4gICAqIEFkZCBhIHByZXBhcmVkIHN1YmNvbW1hbmQuXG4gICAqXG4gICAqIFNlZSAuY29tbWFuZCgpIGZvciBjcmVhdGluZyBhbiBhdHRhY2hlZCBzdWJjb21tYW5kIHdoaWNoIGluaGVyaXRzIHNldHRpbmdzIGZyb20gaXRzIHBhcmVudC5cbiAgICpcbiAgICogQHBhcmFtIHtDb21tYW5kfSBjbWQgLSBuZXcgc3ViY29tbWFuZFxuICAgKiBAcGFyYW0ge29iamVjdH0gW29wdHNdIC0gY29uZmlndXJhdGlvbiBvcHRpb25zXG4gICAqIEByZXR1cm4ge0NvbW1hbmR9IGB0aGlzYCBjb21tYW5kIGZvciBjaGFpbmluZ1xuICAgKi9cblxuICBhZGRDb21tYW5kKGNtZCwgb3B0cykge1xuICAgIGlmICghY21kLl9uYW1lKSB7XG4gICAgICB0aHJvdyBuZXcgRXJyb3IoYENvbW1hbmQgcGFzc2VkIHRvIC5hZGRDb21tYW5kKCkgbXVzdCBoYXZlIGEgbmFtZVxuLSBzcGVjaWZ5IHRoZSBuYW1lIGluIENvbW1hbmQgY29uc3RydWN0b3Igb3IgdXNpbmcgLm5hbWUoKWApO1xuICAgIH1cblxuICAgIG9wdHMgPSBvcHRzIHx8IHt9O1xuICAgIGlmIChvcHRzLmlzRGVmYXVsdCkgdGhpcy5fZGVmYXVsdENvbW1hbmROYW1lID0gY21kLl9uYW1lO1xuICAgIGlmIChvcHRzLm5vSGVscCB8fCBvcHRzLmhpZGRlbikgY21kLl9oaWRkZW4gPSB0cnVlOyAvLyBtb2RpZnlpbmcgcGFzc2VkIGNvbW1hbmQgZHVlIHRvIGV4aXN0aW5nIGltcGxlbWVudGF0aW9uXG5cbiAgICB0aGlzLl9yZWdpc3RlckNvbW1hbmQoY21kKTtcbiAgICBjbWQucGFyZW50ID0gdGhpcztcbiAgICBjbWQuX2NoZWNrRm9yQnJva2VuUGFzc1Rocm91Z2goKTtcblxuICAgIHJldHVybiB0aGlzO1xuICB9XG5cbiAgLyoqXG4gICAqIEZhY3Rvcnkgcm91dGluZSB0byBjcmVhdGUgYSBuZXcgdW5hdHRhY2hlZCBhcmd1bWVudC5cbiAgICpcbiAgICogU2VlIC5hcmd1bWVudCgpIGZvciBjcmVhdGluZyBhbiBhdHRhY2hlZCBhcmd1bWVudCwgd2hpY2ggdXNlcyB0aGlzIHJvdXRpbmUgdG9cbiAgICogY3JlYXRlIHRoZSBhcmd1bWVudC4gWW91IGNhbiBvdmVycmlkZSBjcmVhdGVBcmd1bWVudCB0byByZXR1cm4gYSBjdXN0b20gYXJndW1lbnQuXG4gICAqXG4gICAqIEBwYXJhbSB7c3RyaW5nfSBuYW1lXG4gICAqIEBwYXJhbSB7c3RyaW5nfSBbZGVzY3JpcHRpb25dXG4gICAqIEByZXR1cm4ge0FyZ3VtZW50fSBuZXcgYXJndW1lbnRcbiAgICovXG5cbiAgY3JlYXRlQXJndW1lbnQobmFtZSwgZGVzY3JpcHRpb24pIHtcbiAgICByZXR1cm4gbmV3IEFyZ3VtZW50KG5hbWUsIGRlc2NyaXB0aW9uKTtcbiAgfVxuXG4gIC8qKlxuICAgKiBEZWZpbmUgYXJndW1lbnQgc3ludGF4IGZvciBjb21tYW5kLlxuICAgKlxuICAgKiBUaGUgZGVmYXVsdCBpcyB0aGF0IHRoZSBhcmd1bWVudCBpcyByZXF1aXJlZCwgYW5kIHlvdSBjYW4gZXhwbGljaXRseVxuICAgKiBpbmRpY2F0ZSB0aGlzIHdpdGggPD4gYXJvdW5kIHRoZSBuYW1lLiBQdXQgW10gYXJvdW5kIHRoZSBuYW1lIGZvciBhbiBvcHRpb25hbCBhcmd1bWVudC5cbiAgICpcbiAgICogQGV4YW1wbGVcbiAgICogcHJvZ3JhbS5hcmd1bWVudCgnPGlucHV0LWZpbGU+Jyk7XG4gICAqIHByb2dyYW0uYXJndW1lbnQoJ1tvdXRwdXQtZmlsZV0nKTtcbiAgICpcbiAgICogQHBhcmFtIHtzdHJpbmd9IG5hbWVcbiAgICogQHBhcmFtIHtzdHJpbmd9IFtkZXNjcmlwdGlvbl1cbiAgICogQHBhcmFtIHsoRnVuY3Rpb258Kil9IFtmbl0gLSBjdXN0b20gYXJndW1lbnQgcHJvY2Vzc2luZyBmdW5jdGlvblxuICAgKiBAcGFyYW0geyp9IFtkZWZhdWx0VmFsdWVdXG4gICAqIEByZXR1cm4ge0NvbW1hbmR9IGB0aGlzYCBjb21tYW5kIGZvciBjaGFpbmluZ1xuICAgKi9cbiAgYXJndW1lbnQobmFtZSwgZGVzY3JpcHRpb24sIGZuLCBkZWZhdWx0VmFsdWUpIHtcbiAgICBjb25zdCBhcmd1bWVudCA9IHRoaXMuY3JlYXRlQXJndW1lbnQobmFtZSwgZGVzY3JpcHRpb24pO1xuICAgIGlmICh0eXBlb2YgZm4gPT09ICdmdW5jdGlvbicpIHtcbiAgICAgIGFyZ3VtZW50LmRlZmF1bHQoZGVmYXVsdFZhbHVlKS5hcmdQYXJzZXIoZm4pO1xuICAgIH0gZWxzZSB7XG4gICAgICBhcmd1bWVudC5kZWZhdWx0KGZuKTtcbiAgICB9XG4gICAgdGhpcy5hZGRBcmd1bWVudChhcmd1bWVudCk7XG4gICAgcmV0dXJuIHRoaXM7XG4gIH1cblxuICAvKipcbiAgICogRGVmaW5lIGFyZ3VtZW50IHN5bnRheCBmb3IgY29tbWFuZCwgYWRkaW5nIG11bHRpcGxlIGF0IG9uY2UgKHdpdGhvdXQgZGVzY3JpcHRpb25zKS5cbiAgICpcbiAgICogU2VlIGFsc28gLmFyZ3VtZW50KCkuXG4gICAqXG4gICAqIEBleGFtcGxlXG4gICAqIHByb2dyYW0uYXJndW1lbnRzKCc8Y21kPiBbZW52XScpO1xuICAgKlxuICAgKiBAcGFyYW0ge3N0cmluZ30gbmFtZXNcbiAgICogQHJldHVybiB7Q29tbWFuZH0gYHRoaXNgIGNvbW1hbmQgZm9yIGNoYWluaW5nXG4gICAqL1xuXG4gIGFyZ3VtZW50cyhuYW1lcykge1xuICAgIG5hbWVzXG4gICAgICAudHJpbSgpXG4gICAgICAuc3BsaXQoLyArLylcbiAgICAgIC5mb3JFYWNoKChkZXRhaWwpID0+IHtcbiAgICAgICAgdGhpcy5hcmd1bWVudChkZXRhaWwpO1xuICAgICAgfSk7XG4gICAgcmV0dXJuIHRoaXM7XG4gIH1cblxuICAvKipcbiAgICogRGVmaW5lIGFyZ3VtZW50IHN5bnRheCBmb3IgY29tbWFuZCwgYWRkaW5nIGEgcHJlcGFyZWQgYXJndW1lbnQuXG4gICAqXG4gICAqIEBwYXJhbSB7QXJndW1lbnR9IGFyZ3VtZW50XG4gICAqIEByZXR1cm4ge0NvbW1hbmR9IGB0aGlzYCBjb21tYW5kIGZvciBjaGFpbmluZ1xuICAgKi9cbiAgYWRkQXJndW1lbnQoYXJndW1lbnQpIHtcbiAgICBjb25zdCBwcmV2aW91c0FyZ3VtZW50ID0gdGhpcy5yZWdpc3RlcmVkQXJndW1lbnRzLnNsaWNlKC0xKVswXTtcbiAgICBpZiAocHJldmlvdXNBcmd1bWVudCAmJiBwcmV2aW91c0FyZ3VtZW50LnZhcmlhZGljKSB7XG4gICAgICB0aHJvdyBuZXcgRXJyb3IoXG4gICAgICAgIGBvbmx5IHRoZSBsYXN0IGFyZ3VtZW50IGNhbiBiZSB2YXJpYWRpYyAnJHtwcmV2aW91c0FyZ3VtZW50Lm5hbWUoKX0nYCxcbiAgICAgICk7XG4gICAgfVxuICAgIGlmIChcbiAgICAgIGFyZ3VtZW50LnJlcXVpcmVkICYmXG4gICAgICBhcmd1bWVudC5kZWZhdWx0VmFsdWUgIT09IHVuZGVmaW5lZCAmJlxuICAgICAgYXJndW1lbnQucGFyc2VBcmcgPT09IHVuZGVmaW5lZFxuICAgICkge1xuICAgICAgdGhyb3cgbmV3IEVycm9yKFxuICAgICAgICBgYSBkZWZhdWx0IHZhbHVlIGZvciBhIHJlcXVpcmVkIGFyZ3VtZW50IGlzIG5ldmVyIHVzZWQ6ICcke2FyZ3VtZW50Lm5hbWUoKX0nYCxcbiAgICAgICk7XG4gICAgfVxuICAgIHRoaXMucmVnaXN0ZXJlZEFyZ3VtZW50cy5wdXNoKGFyZ3VtZW50KTtcbiAgICByZXR1cm4gdGhpcztcbiAgfVxuXG4gIC8qKlxuICAgKiBDdXN0b21pc2Ugb3Igb3ZlcnJpZGUgZGVmYXVsdCBoZWxwIGNvbW1hbmQuIEJ5IGRlZmF1bHQgYSBoZWxwIGNvbW1hbmQgaXMgYXV0b21hdGljYWxseSBhZGRlZCBpZiB5b3VyIGNvbW1hbmQgaGFzIHN1YmNvbW1hbmRzLlxuICAgKlxuICAgKiBAZXhhbXBsZVxuICAgKiAgICBwcm9ncmFtLmhlbHBDb21tYW5kKCdoZWxwIFtjbWRdJyk7XG4gICAqICAgIHByb2dyYW0uaGVscENvbW1hbmQoJ2hlbHAgW2NtZF0nLCAnc2hvdyBoZWxwJyk7XG4gICAqICAgIHByb2dyYW0uaGVscENvbW1hbmQoZmFsc2UpOyAvLyBzdXBwcmVzcyBkZWZhdWx0IGhlbHAgY29tbWFuZFxuICAgKiAgICBwcm9ncmFtLmhlbHBDb21tYW5kKHRydWUpOyAvLyBhZGQgaGVscCBjb21tYW5kIGV2ZW4gaWYgbm8gc3ViY29tbWFuZHNcbiAgICpcbiAgICogQHBhcmFtIHtzdHJpbmd8Ym9vbGVhbn0gZW5hYmxlT3JOYW1lQW5kQXJncyAtIGVuYWJsZSB3aXRoIGN1c3RvbSBuYW1lIGFuZC9vciBhcmd1bWVudHMsIG9yIGJvb2xlYW4gdG8gb3ZlcnJpZGUgd2hldGhlciBhZGRlZFxuICAgKiBAcGFyYW0ge3N0cmluZ30gW2Rlc2NyaXB0aW9uXSAtIGN1c3RvbSBkZXNjcmlwdGlvblxuICAgKiBAcmV0dXJuIHtDb21tYW5kfSBgdGhpc2AgY29tbWFuZCBmb3IgY2hhaW5pbmdcbiAgICovXG5cbiAgaGVscENvbW1hbmQoZW5hYmxlT3JOYW1lQW5kQXJncywgZGVzY3JpcHRpb24pIHtcbiAgICBpZiAodHlwZW9mIGVuYWJsZU9yTmFtZUFuZEFyZ3MgPT09ICdib29sZWFuJykge1xuICAgICAgdGhpcy5fYWRkSW1wbGljaXRIZWxwQ29tbWFuZCA9IGVuYWJsZU9yTmFtZUFuZEFyZ3M7XG4gICAgICByZXR1cm4gdGhpcztcbiAgICB9XG5cbiAgICBlbmFibGVPck5hbWVBbmRBcmdzID0gZW5hYmxlT3JOYW1lQW5kQXJncyA/PyAnaGVscCBbY29tbWFuZF0nO1xuICAgIGNvbnN0IFssIGhlbHBOYW1lLCBoZWxwQXJnc10gPSBlbmFibGVPck5hbWVBbmRBcmdzLm1hdGNoKC8oW14gXSspICooLiopLyk7XG4gICAgY29uc3QgaGVscERlc2NyaXB0aW9uID0gZGVzY3JpcHRpb24gPz8gJ2Rpc3BsYXkgaGVscCBmb3IgY29tbWFuZCc7XG5cbiAgICBjb25zdCBoZWxwQ29tbWFuZCA9IHRoaXMuY3JlYXRlQ29tbWFuZChoZWxwTmFtZSk7XG4gICAgaGVscENvbW1hbmQuaGVscE9wdGlvbihmYWxzZSk7XG4gICAgaWYgKGhlbHBBcmdzKSBoZWxwQ29tbWFuZC5hcmd1bWVudHMoaGVscEFyZ3MpO1xuICAgIGlmIChoZWxwRGVzY3JpcHRpb24pIGhlbHBDb21tYW5kLmRlc2NyaXB0aW9uKGhlbHBEZXNjcmlwdGlvbik7XG5cbiAgICB0aGlzLl9hZGRJbXBsaWNpdEhlbHBDb21tYW5kID0gdHJ1ZTtcbiAgICB0aGlzLl9oZWxwQ29tbWFuZCA9IGhlbHBDb21tYW5kO1xuXG4gICAgcmV0dXJuIHRoaXM7XG4gIH1cblxuICAvKipcbiAgICogQWRkIHByZXBhcmVkIGN1c3RvbSBoZWxwIGNvbW1hbmQuXG4gICAqXG4gICAqIEBwYXJhbSB7KENvbW1hbmR8c3RyaW5nfGJvb2xlYW4pfSBoZWxwQ29tbWFuZCAtIGN1c3RvbSBoZWxwIGNvbW1hbmQsIG9yIGRlcHJlY2F0ZWQgZW5hYmxlT3JOYW1lQW5kQXJncyBhcyBmb3IgYC5oZWxwQ29tbWFuZCgpYFxuICAgKiBAcGFyYW0ge3N0cmluZ30gW2RlcHJlY2F0ZWREZXNjcmlwdGlvbl0gLSBkZXByZWNhdGVkIGN1c3RvbSBkZXNjcmlwdGlvbiB1c2VkIHdpdGggY3VzdG9tIG5hbWUgb25seVxuICAgKiBAcmV0dXJuIHtDb21tYW5kfSBgdGhpc2AgY29tbWFuZCBmb3IgY2hhaW5pbmdcbiAgICovXG4gIGFkZEhlbHBDb21tYW5kKGhlbHBDb21tYW5kLCBkZXByZWNhdGVkRGVzY3JpcHRpb24pIHtcbiAgICAvLyBJZiBub3QgcGFzc2VkIGFuIG9iamVjdCwgY2FsbCB0aHJvdWdoIHRvIGhlbHBDb21tYW5kIGZvciBiYWNrd2FyZHMgY29tcGF0aWJpbGl0eSxcbiAgICAvLyBhcyBhZGRIZWxwQ29tbWFuZCB3YXMgb3JpZ2luYWxseSB1c2VkIGxpa2UgaGVscENvbW1hbmQgaXMgbm93LlxuICAgIGlmICh0eXBlb2YgaGVscENvbW1hbmQgIT09ICdvYmplY3QnKSB7XG4gICAgICB0aGlzLmhlbHBDb21tYW5kKGhlbHBDb21tYW5kLCBkZXByZWNhdGVkRGVzY3JpcHRpb24pO1xuICAgICAgcmV0dXJuIHRoaXM7XG4gICAgfVxuXG4gICAgdGhpcy5fYWRkSW1wbGljaXRIZWxwQ29tbWFuZCA9IHRydWU7XG4gICAgdGhpcy5faGVscENvbW1hbmQgPSBoZWxwQ29tbWFuZDtcbiAgICByZXR1cm4gdGhpcztcbiAgfVxuXG4gIC8qKlxuICAgKiBMYXp5IGNyZWF0ZSBoZWxwIGNvbW1hbmQuXG4gICAqXG4gICAqIEByZXR1cm4geyhDb21tYW5kfG51bGwpfVxuICAgKiBAcGFja2FnZVxuICAgKi9cbiAgX2dldEhlbHBDb21tYW5kKCkge1xuICAgIGNvbnN0IGhhc0ltcGxpY2l0SGVscENvbW1hbmQgPVxuICAgICAgdGhpcy5fYWRkSW1wbGljaXRIZWxwQ29tbWFuZCA/P1xuICAgICAgKHRoaXMuY29tbWFuZHMubGVuZ3RoICYmXG4gICAgICAgICF0aGlzLl9hY3Rpb25IYW5kbGVyICYmXG4gICAgICAgICF0aGlzLl9maW5kQ29tbWFuZCgnaGVscCcpKTtcblxuICAgIGlmIChoYXNJbXBsaWNpdEhlbHBDb21tYW5kKSB7XG4gICAgICBpZiAodGhpcy5faGVscENvbW1hbmQgPT09IHVuZGVmaW5lZCkge1xuICAgICAgICB0aGlzLmhlbHBDb21tYW5kKHVuZGVmaW5lZCwgdW5kZWZpbmVkKTsgLy8gdXNlIGRlZmF1bHQgbmFtZSBhbmQgZGVzY3JpcHRpb25cbiAgICAgIH1cbiAgICAgIHJldHVybiB0aGlzLl9oZWxwQ29tbWFuZDtcbiAgICB9XG4gICAgcmV0dXJuIG51bGw7XG4gIH1cblxuICAvKipcbiAgICogQWRkIGhvb2sgZm9yIGxpZmUgY3ljbGUgZXZlbnQuXG4gICAqXG4gICAqIEBwYXJhbSB7c3RyaW5nfSBldmVudFxuICAgKiBAcGFyYW0ge0Z1bmN0aW9ufSBsaXN0ZW5lclxuICAgKiBAcmV0dXJuIHtDb21tYW5kfSBgdGhpc2AgY29tbWFuZCBmb3IgY2hhaW5pbmdcbiAgICovXG5cbiAgaG9vayhldmVudCwgbGlzdGVuZXIpIHtcbiAgICBjb25zdCBhbGxvd2VkVmFsdWVzID0gWydwcmVTdWJjb21tYW5kJywgJ3ByZUFjdGlvbicsICdwb3N0QWN0aW9uJ107XG4gICAgaWYgKCFhbGxvd2VkVmFsdWVzLmluY2x1ZGVzKGV2ZW50KSkge1xuICAgICAgdGhyb3cgbmV3IEVycm9yKGBVbmV4cGVjdGVkIHZhbHVlIGZvciBldmVudCBwYXNzZWQgdG8gaG9vayA6ICcke2V2ZW50fScuXG5FeHBlY3Rpbmcgb25lIG9mICcke2FsbG93ZWRWYWx1ZXMuam9pbihcIicsICdcIil9J2ApO1xuICAgIH1cbiAgICBpZiAodGhpcy5fbGlmZUN5Y2xlSG9va3NbZXZlbnRdKSB7XG4gICAgICB0aGlzLl9saWZlQ3ljbGVIb29rc1tldmVudF0ucHVzaChsaXN0ZW5lcik7XG4gICAgfSBlbHNlIHtcbiAgICAgIHRoaXMuX2xpZmVDeWNsZUhvb2tzW2V2ZW50XSA9IFtsaXN0ZW5lcl07XG4gICAgfVxuICAgIHJldHVybiB0aGlzO1xuICB9XG5cbiAgLyoqXG4gICAqIFJlZ2lzdGVyIGNhbGxiYWNrIHRvIHVzZSBhcyByZXBsYWNlbWVudCBmb3IgY2FsbGluZyBwcm9jZXNzLmV4aXQuXG4gICAqXG4gICAqIEBwYXJhbSB7RnVuY3Rpb259IFtmbl0gb3B0aW9uYWwgY2FsbGJhY2sgd2hpY2ggd2lsbCBiZSBwYXNzZWQgYSBDb21tYW5kZXJFcnJvciwgZGVmYXVsdHMgdG8gdGhyb3dpbmdcbiAgICogQHJldHVybiB7Q29tbWFuZH0gYHRoaXNgIGNvbW1hbmQgZm9yIGNoYWluaW5nXG4gICAqL1xuXG4gIGV4aXRPdmVycmlkZShmbikge1xuICAgIGlmIChmbikge1xuICAgICAgdGhpcy5fZXhpdENhbGxiYWNrID0gZm47XG4gICAgfSBlbHNlIHtcbiAgICAgIHRoaXMuX2V4aXRDYWxsYmFjayA9IChlcnIpID0+IHtcbiAgICAgICAgaWYgKGVyci5jb2RlICE9PSAnY29tbWFuZGVyLmV4ZWN1dGVTdWJDb21tYW5kQXN5bmMnKSB7XG4gICAgICAgICAgdGhyb3cgZXJyO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIC8vIEFzeW5jIGNhbGxiYWNrIGZyb20gc3Bhd24gZXZlbnRzLCBub3QgdXNlZnVsIHRvIHRocm93LlxuICAgICAgICB9XG4gICAgICB9O1xuICAgIH1cbiAgICByZXR1cm4gdGhpcztcbiAgfVxuXG4gIC8qKlxuICAgKiBDYWxsIHByb2Nlc3MuZXhpdCwgYW5kIF9leGl0Q2FsbGJhY2sgaWYgZGVmaW5lZC5cbiAgICpcbiAgICogQHBhcmFtIHtudW1iZXJ9IGV4aXRDb2RlIGV4aXQgY29kZSBmb3IgdXNpbmcgd2l0aCBwcm9jZXNzLmV4aXRcbiAgICogQHBhcmFtIHtzdHJpbmd9IGNvZGUgYW4gaWQgc3RyaW5nIHJlcHJlc2VudGluZyB0aGUgZXJyb3JcbiAgICogQHBhcmFtIHtzdHJpbmd9IG1lc3NhZ2UgaHVtYW4tcmVhZGFibGUgZGVzY3JpcHRpb24gb2YgdGhlIGVycm9yXG4gICAqIEByZXR1cm4gbmV2ZXJcbiAgICogQHByaXZhdGVcbiAgICovXG5cbiAgX2V4aXQoZXhpdENvZGUsIGNvZGUsIG1lc3NhZ2UpIHtcbiAgICBpZiAodGhpcy5fZXhpdENhbGxiYWNrKSB7XG4gICAgICB0aGlzLl9leGl0Q2FsbGJhY2sobmV3IENvbW1hbmRlckVycm9yKGV4aXRDb2RlLCBjb2RlLCBtZXNzYWdlKSk7XG4gICAgICAvLyBFeHBlY3RpbmcgdGhpcyBsaW5lIGlzIG5vdCByZWFjaGVkLlxuICAgIH1cbiAgICBwcm9jZXNzLmV4aXQoZXhpdENvZGUpO1xuICB9XG5cbiAgLyoqXG4gICAqIFJlZ2lzdGVyIGNhbGxiYWNrIGBmbmAgZm9yIHRoZSBjb21tYW5kLlxuICAgKlxuICAgKiBAZXhhbXBsZVxuICAgKiBwcm9ncmFtXG4gICAqICAgLmNvbW1hbmQoJ3NlcnZlJylcbiAgICogICAuZGVzY3JpcHRpb24oJ3N0YXJ0IHNlcnZpY2UnKVxuICAgKiAgIC5hY3Rpb24oZnVuY3Rpb24oKSB7XG4gICAqICAgICAgLy8gZG8gd29yayBoZXJlXG4gICAqICAgfSk7XG4gICAqXG4gICAqIEBwYXJhbSB7RnVuY3Rpb259IGZuXG4gICAqIEByZXR1cm4ge0NvbW1hbmR9IGB0aGlzYCBjb21tYW5kIGZvciBjaGFpbmluZ1xuICAgKi9cblxuICBhY3Rpb24oZm4pIHtcbiAgICBjb25zdCBsaXN0ZW5lciA9IChhcmdzKSA9PiB7XG4gICAgICAvLyBUaGUgLmFjdGlvbiBjYWxsYmFjayB0YWtlcyBhbiBleHRyYSBwYXJhbWV0ZXIgd2hpY2ggaXMgdGhlIGNvbW1hbmQgb3Igb3B0aW9ucy5cbiAgICAgIGNvbnN0IGV4cGVjdGVkQXJnc0NvdW50ID0gdGhpcy5yZWdpc3RlcmVkQXJndW1lbnRzLmxlbmd0aDtcbiAgICAgIGNvbnN0IGFjdGlvbkFyZ3MgPSBhcmdzLnNsaWNlKDAsIGV4cGVjdGVkQXJnc0NvdW50KTtcbiAgICAgIGlmICh0aGlzLl9zdG9yZU9wdGlvbnNBc1Byb3BlcnRpZXMpIHtcbiAgICAgICAgYWN0aW9uQXJnc1tleHBlY3RlZEFyZ3NDb3VudF0gPSB0aGlzOyAvLyBiYWNrd2FyZHMgY29tcGF0aWJsZSBcIm9wdGlvbnNcIlxuICAgICAgfSBlbHNlIHtcbiAgICAgICAgYWN0aW9uQXJnc1tleHBlY3RlZEFyZ3NDb3VudF0gPSB0aGlzLm9wdHMoKTtcbiAgICAgIH1cbiAgICAgIGFjdGlvbkFyZ3MucHVzaCh0aGlzKTtcblxuICAgICAgcmV0dXJuIGZuLmFwcGx5KHRoaXMsIGFjdGlvbkFyZ3MpO1xuICAgIH07XG4gICAgdGhpcy5fYWN0aW9uSGFuZGxlciA9IGxpc3RlbmVyO1xuICAgIHJldHVybiB0aGlzO1xuICB9XG5cbiAgLyoqXG4gICAqIEZhY3Rvcnkgcm91dGluZSB0byBjcmVhdGUgYSBuZXcgdW5hdHRhY2hlZCBvcHRpb24uXG4gICAqXG4gICAqIFNlZSAub3B0aW9uKCkgZm9yIGNyZWF0aW5nIGFuIGF0dGFjaGVkIG9wdGlvbiwgd2hpY2ggdXNlcyB0aGlzIHJvdXRpbmUgdG9cbiAgICogY3JlYXRlIHRoZSBvcHRpb24uIFlvdSBjYW4gb3ZlcnJpZGUgY3JlYXRlT3B0aW9uIHRvIHJldHVybiBhIGN1c3RvbSBvcHRpb24uXG4gICAqXG4gICAqIEBwYXJhbSB7c3RyaW5nfSBmbGFnc1xuICAgKiBAcGFyYW0ge3N0cmluZ30gW2Rlc2NyaXB0aW9uXVxuICAgKiBAcmV0dXJuIHtPcHRpb259IG5ldyBvcHRpb25cbiAgICovXG5cbiAgY3JlYXRlT3B0aW9uKGZsYWdzLCBkZXNjcmlwdGlvbikge1xuICAgIHJldHVybiBuZXcgT3B0aW9uKGZsYWdzLCBkZXNjcmlwdGlvbik7XG4gIH1cblxuICAvKipcbiAgICogV3JhcCBwYXJzZUFyZ3MgdG8gY2F0Y2ggJ2NvbW1hbmRlci5pbnZhbGlkQXJndW1lbnQnLlxuICAgKlxuICAgKiBAcGFyYW0geyhPcHRpb24gfCBBcmd1bWVudCl9IHRhcmdldFxuICAgKiBAcGFyYW0ge3N0cmluZ30gdmFsdWVcbiAgICogQHBhcmFtIHsqfSBwcmV2aW91c1xuICAgKiBAcGFyYW0ge3N0cmluZ30gaW52YWxpZEFyZ3VtZW50TWVzc2FnZVxuICAgKiBAcHJpdmF0ZVxuICAgKi9cblxuICBfY2FsbFBhcnNlQXJnKHRhcmdldCwgdmFsdWUsIHByZXZpb3VzLCBpbnZhbGlkQXJndW1lbnRNZXNzYWdlKSB7XG4gICAgdHJ5IHtcbiAgICAgIHJldHVybiB0YXJnZXQucGFyc2VBcmcodmFsdWUsIHByZXZpb3VzKTtcbiAgICB9IGNhdGNoIChlcnIpIHtcbiAgICAgIGlmIChlcnIuY29kZSA9PT0gJ2NvbW1hbmRlci5pbnZhbGlkQXJndW1lbnQnKSB7XG4gICAgICAgIGNvbnN0IG1lc3NhZ2UgPSBgJHtpbnZhbGlkQXJndW1lbnRNZXNzYWdlfSAke2Vyci5tZXNzYWdlfWA7XG4gICAgICAgIHRoaXMuZXJyb3IobWVzc2FnZSwgeyBleGl0Q29kZTogZXJyLmV4aXRDb2RlLCBjb2RlOiBlcnIuY29kZSB9KTtcbiAgICAgIH1cbiAgICAgIHRocm93IGVycjtcbiAgICB9XG4gIH1cblxuICAvKipcbiAgICogQ2hlY2sgZm9yIG9wdGlvbiBmbGFnIGNvbmZsaWN0cy5cbiAgICogUmVnaXN0ZXIgb3B0aW9uIGlmIG5vIGNvbmZsaWN0cyBmb3VuZCwgb3IgdGhyb3cgb24gY29uZmxpY3QuXG4gICAqXG4gICAqIEBwYXJhbSB7T3B0aW9ufSBvcHRpb25cbiAgICogQHByaXZhdGVcbiAgICovXG5cbiAgX3JlZ2lzdGVyT3B0aW9uKG9wdGlvbikge1xuICAgIGNvbnN0IG1hdGNoaW5nT3B0aW9uID1cbiAgICAgIChvcHRpb24uc2hvcnQgJiYgdGhpcy5fZmluZE9wdGlvbihvcHRpb24uc2hvcnQpKSB8fFxuICAgICAgKG9wdGlvbi5sb25nICYmIHRoaXMuX2ZpbmRPcHRpb24ob3B0aW9uLmxvbmcpKTtcbiAgICBpZiAobWF0Y2hpbmdPcHRpb24pIHtcbiAgICAgIGNvbnN0IG1hdGNoaW5nRmxhZyA9XG4gICAgICAgIG9wdGlvbi5sb25nICYmIHRoaXMuX2ZpbmRPcHRpb24ob3B0aW9uLmxvbmcpXG4gICAgICAgICAgPyBvcHRpb24ubG9uZ1xuICAgICAgICAgIDogb3B0aW9uLnNob3J0O1xuICAgICAgdGhyb3cgbmV3IEVycm9yKGBDYW5ub3QgYWRkIG9wdGlvbiAnJHtvcHRpb24uZmxhZ3N9JyR7dGhpcy5fbmFtZSAmJiBgIHRvIGNvbW1hbmQgJyR7dGhpcy5fbmFtZX0nYH0gZHVlIHRvIGNvbmZsaWN0aW5nIGZsYWcgJyR7bWF0Y2hpbmdGbGFnfSdcbi0gIGFscmVhZHkgdXNlZCBieSBvcHRpb24gJyR7bWF0Y2hpbmdPcHRpb24uZmxhZ3N9J2ApO1xuICAgIH1cblxuICAgIHRoaXMub3B0aW9ucy5wdXNoKG9wdGlvbik7XG4gIH1cblxuICAvKipcbiAgICogQ2hlY2sgZm9yIGNvbW1hbmQgbmFtZSBhbmQgYWxpYXMgY29uZmxpY3RzIHdpdGggZXhpc3RpbmcgY29tbWFuZHMuXG4gICAqIFJlZ2lzdGVyIGNvbW1hbmQgaWYgbm8gY29uZmxpY3RzIGZvdW5kLCBvciB0aHJvdyBvbiBjb25mbGljdC5cbiAgICpcbiAgICogQHBhcmFtIHtDb21tYW5kfSBjb21tYW5kXG4gICAqIEBwcml2YXRlXG4gICAqL1xuXG4gIF9yZWdpc3RlckNvbW1hbmQoY29tbWFuZCkge1xuICAgIGNvbnN0IGtub3duQnkgPSAoY21kKSA9PiB7XG4gICAgICByZXR1cm4gW2NtZC5uYW1lKCldLmNvbmNhdChjbWQuYWxpYXNlcygpKTtcbiAgICB9O1xuXG4gICAgY29uc3QgYWxyZWFkeVVzZWQgPSBrbm93bkJ5KGNvbW1hbmQpLmZpbmQoKG5hbWUpID0+XG4gICAgICB0aGlzLl9maW5kQ29tbWFuZChuYW1lKSxcbiAgICApO1xuICAgIGlmIChhbHJlYWR5VXNlZCkge1xuICAgICAgY29uc3QgZXhpc3RpbmdDbWQgPSBrbm93bkJ5KHRoaXMuX2ZpbmRDb21tYW5kKGFscmVhZHlVc2VkKSkuam9pbignfCcpO1xuICAgICAgY29uc3QgbmV3Q21kID0ga25vd25CeShjb21tYW5kKS5qb2luKCd8Jyk7XG4gICAgICB0aHJvdyBuZXcgRXJyb3IoXG4gICAgICAgIGBjYW5ub3QgYWRkIGNvbW1hbmQgJyR7bmV3Q21kfScgYXMgYWxyZWFkeSBoYXZlIGNvbW1hbmQgJyR7ZXhpc3RpbmdDbWR9J2AsXG4gICAgICApO1xuICAgIH1cblxuICAgIHRoaXMuY29tbWFuZHMucHVzaChjb21tYW5kKTtcbiAgfVxuXG4gIC8qKlxuICAgKiBBZGQgYW4gb3B0aW9uLlxuICAgKlxuICAgKiBAcGFyYW0ge09wdGlvbn0gb3B0aW9uXG4gICAqIEByZXR1cm4ge0NvbW1hbmR9IGB0aGlzYCBjb21tYW5kIGZvciBjaGFpbmluZ1xuICAgKi9cbiAgYWRkT3B0aW9uKG9wdGlvbikge1xuICAgIHRoaXMuX3JlZ2lzdGVyT3B0aW9uKG9wdGlvbik7XG5cbiAgICBjb25zdCBvbmFtZSA9IG9wdGlvbi5uYW1lKCk7XG4gICAgY29uc3QgbmFtZSA9IG9wdGlvbi5hdHRyaWJ1dGVOYW1lKCk7XG5cbiAgICAvLyBzdG9yZSBkZWZhdWx0IHZhbHVlXG4gICAgaWYgKG9wdGlvbi5uZWdhdGUpIHtcbiAgICAgIC8vIC0tbm8tZm9vIGlzIHNwZWNpYWwgYW5kIGRlZmF1bHRzIGZvbyB0byB0cnVlLCB1bmxlc3MgYSAtLWZvbyBvcHRpb24gaXMgYWxyZWFkeSBkZWZpbmVkXG4gICAgICBjb25zdCBwb3NpdGl2ZUxvbmdGbGFnID0gb3B0aW9uLmxvbmcucmVwbGFjZSgvXi0tbm8tLywgJy0tJyk7XG4gICAgICBpZiAoIXRoaXMuX2ZpbmRPcHRpb24ocG9zaXRpdmVMb25nRmxhZykpIHtcbiAgICAgICAgdGhpcy5zZXRPcHRpb25WYWx1ZVdpdGhTb3VyY2UoXG4gICAgICAgICAgbmFtZSxcbiAgICAgICAgICBvcHRpb24uZGVmYXVsdFZhbHVlID09PSB1bmRlZmluZWQgPyB0cnVlIDogb3B0aW9uLmRlZmF1bHRWYWx1ZSxcbiAgICAgICAgICAnZGVmYXVsdCcsXG4gICAgICAgICk7XG4gICAgICB9XG4gICAgfSBlbHNlIGlmIChvcHRpb24uZGVmYXVsdFZhbHVlICE9PSB1bmRlZmluZWQpIHtcbiAgICAgIHRoaXMuc2V0T3B0aW9uVmFsdWVXaXRoU291cmNlKG5hbWUsIG9wdGlvbi5kZWZhdWx0VmFsdWUsICdkZWZhdWx0Jyk7XG4gICAgfVxuXG4gICAgLy8gaGFuZGxlciBmb3IgY2xpIGFuZCBlbnYgc3VwcGxpZWQgdmFsdWVzXG4gICAgY29uc3QgaGFuZGxlT3B0aW9uVmFsdWUgPSAodmFsLCBpbnZhbGlkVmFsdWVNZXNzYWdlLCB2YWx1ZVNvdXJjZSkgPT4ge1xuICAgICAgLy8gdmFsIGlzIG51bGwgZm9yIG9wdGlvbmFsIG9wdGlvbiB1c2VkIHdpdGhvdXQgYW4gb3B0aW9uYWwtYXJndW1lbnQuXG4gICAgICAvLyB2YWwgaXMgdW5kZWZpbmVkIGZvciBib29sZWFuIGFuZCBuZWdhdGVkIG9wdGlvbi5cbiAgICAgIGlmICh2YWwgPT0gbnVsbCAmJiBvcHRpb24ucHJlc2V0QXJnICE9PSB1bmRlZmluZWQpIHtcbiAgICAgICAgdmFsID0gb3B0aW9uLnByZXNldEFyZztcbiAgICAgIH1cblxuICAgICAgLy8gY3VzdG9tIHByb2Nlc3NpbmdcbiAgICAgIGNvbnN0IG9sZFZhbHVlID0gdGhpcy5nZXRPcHRpb25WYWx1ZShuYW1lKTtcbiAgICAgIGlmICh2YWwgIT09IG51bGwgJiYgb3B0aW9uLnBhcnNlQXJnKSB7XG4gICAgICAgIHZhbCA9IHRoaXMuX2NhbGxQYXJzZUFyZyhvcHRpb24sIHZhbCwgb2xkVmFsdWUsIGludmFsaWRWYWx1ZU1lc3NhZ2UpO1xuICAgICAgfSBlbHNlIGlmICh2YWwgIT09IG51bGwgJiYgb3B0aW9uLnZhcmlhZGljKSB7XG4gICAgICAgIHZhbCA9IG9wdGlvbi5fY29uY2F0VmFsdWUodmFsLCBvbGRWYWx1ZSk7XG4gICAgICB9XG5cbiAgICAgIC8vIEZpbGwtaW4gYXBwcm9wcmlhdGUgbWlzc2luZyB2YWx1ZXMuIExvbmcgd2luZGVkIGJ1dCBlYXN5IHRvIGZvbGxvdy5cbiAgICAgIGlmICh2YWwgPT0gbnVsbCkge1xuICAgICAgICBpZiAob3B0aW9uLm5lZ2F0ZSkge1xuICAgICAgICAgIHZhbCA9IGZhbHNlO1xuICAgICAgICB9IGVsc2UgaWYgKG9wdGlvbi5pc0Jvb2xlYW4oKSB8fCBvcHRpb24ub3B0aW9uYWwpIHtcbiAgICAgICAgICB2YWwgPSB0cnVlO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIHZhbCA9ICcnOyAvLyBub3Qgbm9ybWFsLCBwYXJzZUFyZyBtaWdodCBoYXZlIGZhaWxlZCBvciBiZSBhIG1vY2sgZnVuY3Rpb24gZm9yIHRlc3RpbmdcbiAgICAgICAgfVxuICAgICAgfVxuICAgICAgdGhpcy5zZXRPcHRpb25WYWx1ZVdpdGhTb3VyY2UobmFtZSwgdmFsLCB2YWx1ZVNvdXJjZSk7XG4gICAgfTtcblxuICAgIHRoaXMub24oJ29wdGlvbjonICsgb25hbWUsICh2YWwpID0+IHtcbiAgICAgIGNvbnN0IGludmFsaWRWYWx1ZU1lc3NhZ2UgPSBgZXJyb3I6IG9wdGlvbiAnJHtvcHRpb24uZmxhZ3N9JyBhcmd1bWVudCAnJHt2YWx9JyBpcyBpbnZhbGlkLmA7XG4gICAgICBoYW5kbGVPcHRpb25WYWx1ZSh2YWwsIGludmFsaWRWYWx1ZU1lc3NhZ2UsICdjbGknKTtcbiAgICB9KTtcblxuICAgIGlmIChvcHRpb24uZW52VmFyKSB7XG4gICAgICB0aGlzLm9uKCdvcHRpb25FbnY6JyArIG9uYW1lLCAodmFsKSA9PiB7XG4gICAgICAgIGNvbnN0IGludmFsaWRWYWx1ZU1lc3NhZ2UgPSBgZXJyb3I6IG9wdGlvbiAnJHtvcHRpb24uZmxhZ3N9JyB2YWx1ZSAnJHt2YWx9JyBmcm9tIGVudiAnJHtvcHRpb24uZW52VmFyfScgaXMgaW52YWxpZC5gO1xuICAgICAgICBoYW5kbGVPcHRpb25WYWx1ZSh2YWwsIGludmFsaWRWYWx1ZU1lc3NhZ2UsICdlbnYnKTtcbiAgICAgIH0pO1xuICAgIH1cblxuICAgIHJldHVybiB0aGlzO1xuICB9XG5cbiAgLyoqXG4gICAqIEludGVybmFsIGltcGxlbWVudGF0aW9uIHNoYXJlZCBieSAub3B0aW9uKCkgYW5kIC5yZXF1aXJlZE9wdGlvbigpXG4gICAqXG4gICAqIEByZXR1cm4ge0NvbW1hbmR9IGB0aGlzYCBjb21tYW5kIGZvciBjaGFpbmluZ1xuICAgKiBAcHJpdmF0ZVxuICAgKi9cbiAgX29wdGlvbkV4KGNvbmZpZywgZmxhZ3MsIGRlc2NyaXB0aW9uLCBmbiwgZGVmYXVsdFZhbHVlKSB7XG4gICAgaWYgKHR5cGVvZiBmbGFncyA9PT0gJ29iamVjdCcgJiYgZmxhZ3MgaW5zdGFuY2VvZiBPcHRpb24pIHtcbiAgICAgIHRocm93IG5ldyBFcnJvcihcbiAgICAgICAgJ1RvIGFkZCBhbiBPcHRpb24gb2JqZWN0IHVzZSBhZGRPcHRpb24oKSBpbnN0ZWFkIG9mIG9wdGlvbigpIG9yIHJlcXVpcmVkT3B0aW9uKCknLFxuICAgICAgKTtcbiAgICB9XG4gICAgY29uc3Qgb3B0aW9uID0gdGhpcy5jcmVhdGVPcHRpb24oZmxhZ3MsIGRlc2NyaXB0aW9uKTtcbiAgICBvcHRpb24ubWFrZU9wdGlvbk1hbmRhdG9yeSghIWNvbmZpZy5tYW5kYXRvcnkpO1xuICAgIGlmICh0eXBlb2YgZm4gPT09ICdmdW5jdGlvbicpIHtcbiAgICAgIG9wdGlvbi5kZWZhdWx0KGRlZmF1bHRWYWx1ZSkuYXJnUGFyc2VyKGZuKTtcbiAgICB9IGVsc2UgaWYgKGZuIGluc3RhbmNlb2YgUmVnRXhwKSB7XG4gICAgICAvLyBkZXByZWNhdGVkXG4gICAgICBjb25zdCByZWdleCA9IGZuO1xuICAgICAgZm4gPSAodmFsLCBkZWYpID0+IHtcbiAgICAgICAgY29uc3QgbSA9IHJlZ2V4LmV4ZWModmFsKTtcbiAgICAgICAgcmV0dXJuIG0gPyBtWzBdIDogZGVmO1xuICAgICAgfTtcbiAgICAgIG9wdGlvbi5kZWZhdWx0KGRlZmF1bHRWYWx1ZSkuYXJnUGFyc2VyKGZuKTtcbiAgICB9IGVsc2Uge1xuICAgICAgb3B0aW9uLmRlZmF1bHQoZm4pO1xuICAgIH1cblxuICAgIHJldHVybiB0aGlzLmFkZE9wdGlvbihvcHRpb24pO1xuICB9XG5cbiAgLyoqXG4gICAqIERlZmluZSBvcHRpb24gd2l0aCBgZmxhZ3NgLCBgZGVzY3JpcHRpb25gLCBhbmQgb3B0aW9uYWwgYXJndW1lbnQgcGFyc2luZyBmdW5jdGlvbiBvciBgZGVmYXVsdFZhbHVlYCBvciBib3RoLlxuICAgKlxuICAgKiBUaGUgYGZsYWdzYCBzdHJpbmcgY29udGFpbnMgdGhlIHNob3J0IGFuZC9vciBsb25nIGZsYWdzLCBzZXBhcmF0ZWQgYnkgY29tbWEsIGEgcGlwZSBvciBzcGFjZS4gQSByZXF1aXJlZFxuICAgKiBvcHRpb24tYXJndW1lbnQgaXMgaW5kaWNhdGVkIGJ5IGA8PmAgYW5kIGFuIG9wdGlvbmFsIG9wdGlvbi1hcmd1bWVudCBieSBgW11gLlxuICAgKlxuICAgKiBTZWUgdGhlIFJFQURNRSBmb3IgbW9yZSBkZXRhaWxzLCBhbmQgc2VlIGFsc28gYWRkT3B0aW9uKCkgYW5kIHJlcXVpcmVkT3B0aW9uKCkuXG4gICAqXG4gICAqIEBleGFtcGxlXG4gICAqIHByb2dyYW1cbiAgICogICAgIC5vcHRpb24oJy1wLCAtLXBlcHBlcicsICdhZGQgcGVwcGVyJylcbiAgICogICAgIC5vcHRpb24oJy1wLCAtLXBpenphLXR5cGUgPFRZUEU+JywgJ3R5cGUgb2YgcGl6emEnKSAvLyByZXF1aXJlZCBvcHRpb24tYXJndW1lbnRcbiAgICogICAgIC5vcHRpb24oJy1jLCAtLWNoZWVzZSBbQ0hFRVNFXScsICdhZGQgZXh0cmEgY2hlZXNlJywgJ21venphcmVsbGEnKSAvLyBvcHRpb25hbCBvcHRpb24tYXJndW1lbnQgd2l0aCBkZWZhdWx0XG4gICAqICAgICAub3B0aW9uKCctdCwgLS10aXAgPFZBTFVFPicsICdhZGQgdGlwIHRvIHB1cmNoYXNlIGNvc3QnLCBwYXJzZUZsb2F0KSAvLyBjdXN0b20gcGFyc2UgZnVuY3Rpb25cbiAgICpcbiAgICogQHBhcmFtIHtzdHJpbmd9IGZsYWdzXG4gICAqIEBwYXJhbSB7c3RyaW5nfSBbZGVzY3JpcHRpb25dXG4gICAqIEBwYXJhbSB7KEZ1bmN0aW9ufCopfSBbcGFyc2VBcmddIC0gY3VzdG9tIG9wdGlvbiBwcm9jZXNzaW5nIGZ1bmN0aW9uIG9yIGRlZmF1bHQgdmFsdWVcbiAgICogQHBhcmFtIHsqfSBbZGVmYXVsdFZhbHVlXVxuICAgKiBAcmV0dXJuIHtDb21tYW5kfSBgdGhpc2AgY29tbWFuZCBmb3IgY2hhaW5pbmdcbiAgICovXG5cbiAgb3B0aW9uKGZsYWdzLCBkZXNjcmlwdGlvbiwgcGFyc2VBcmcsIGRlZmF1bHRWYWx1ZSkge1xuICAgIHJldHVybiB0aGlzLl9vcHRpb25FeCh7fSwgZmxhZ3MsIGRlc2NyaXB0aW9uLCBwYXJzZUFyZywgZGVmYXVsdFZhbHVlKTtcbiAgfVxuXG4gIC8qKlxuICAgKiBBZGQgYSByZXF1aXJlZCBvcHRpb24gd2hpY2ggbXVzdCBoYXZlIGEgdmFsdWUgYWZ0ZXIgcGFyc2luZy4gVGhpcyB1c3VhbGx5IG1lYW5zXG4gICAqIHRoZSBvcHRpb24gbXVzdCBiZSBzcGVjaWZpZWQgb24gdGhlIGNvbW1hbmQgbGluZS4gKE90aGVyd2lzZSB0aGUgc2FtZSBhcyAub3B0aW9uKCkuKVxuICAgKlxuICAgKiBUaGUgYGZsYWdzYCBzdHJpbmcgY29udGFpbnMgdGhlIHNob3J0IGFuZC9vciBsb25nIGZsYWdzLCBzZXBhcmF0ZWQgYnkgY29tbWEsIGEgcGlwZSBvciBzcGFjZS5cbiAgICpcbiAgICogQHBhcmFtIHtzdHJpbmd9IGZsYWdzXG4gICAqIEBwYXJhbSB7c3RyaW5nfSBbZGVzY3JpcHRpb25dXG4gICAqIEBwYXJhbSB7KEZ1bmN0aW9ufCopfSBbcGFyc2VBcmddIC0gY3VzdG9tIG9wdGlvbiBwcm9jZXNzaW5nIGZ1bmN0aW9uIG9yIGRlZmF1bHQgdmFsdWVcbiAgICogQHBhcmFtIHsqfSBbZGVmYXVsdFZhbHVlXVxuICAgKiBAcmV0dXJuIHtDb21tYW5kfSBgdGhpc2AgY29tbWFuZCBmb3IgY2hhaW5pbmdcbiAgICovXG5cbiAgcmVxdWlyZWRPcHRpb24oZmxhZ3MsIGRlc2NyaXB0aW9uLCBwYXJzZUFyZywgZGVmYXVsdFZhbHVlKSB7XG4gICAgcmV0dXJuIHRoaXMuX29wdGlvbkV4KFxuICAgICAgeyBtYW5kYXRvcnk6IHRydWUgfSxcbiAgICAgIGZsYWdzLFxuICAgICAgZGVzY3JpcHRpb24sXG4gICAgICBwYXJzZUFyZyxcbiAgICAgIGRlZmF1bHRWYWx1ZSxcbiAgICApO1xuICB9XG5cbiAgLyoqXG4gICAqIEFsdGVyIHBhcnNpbmcgb2Ygc2hvcnQgZmxhZ3Mgd2l0aCBvcHRpb25hbCB2YWx1ZXMuXG4gICAqXG4gICAqIEBleGFtcGxlXG4gICAqIC8vIGZvciBgLm9wdGlvbignLWYsLS1mbGFnIFt2YWx1ZV0nKTpcbiAgICogcHJvZ3JhbS5jb21iaW5lRmxhZ0FuZE9wdGlvbmFsVmFsdWUodHJ1ZSk7ICAvLyBgLWY4MGAgaXMgdHJlYXRlZCBsaWtlIGAtLWZsYWc9ODBgLCB0aGlzIGlzIHRoZSBkZWZhdWx0IGJlaGF2aW91clxuICAgKiBwcm9ncmFtLmNvbWJpbmVGbGFnQW5kT3B0aW9uYWxWYWx1ZShmYWxzZSkgLy8gYC1mYmAgaXMgdHJlYXRlZCBsaWtlIGAtZiAtYmBcbiAgICpcbiAgICogQHBhcmFtIHtib29sZWFufSBbY29tYmluZV0gLSBpZiBgdHJ1ZWAgb3Igb21pdHRlZCwgYW4gb3B0aW9uYWwgdmFsdWUgY2FuIGJlIHNwZWNpZmllZCBkaXJlY3RseSBhZnRlciB0aGUgZmxhZy5cbiAgICogQHJldHVybiB7Q29tbWFuZH0gYHRoaXNgIGNvbW1hbmQgZm9yIGNoYWluaW5nXG4gICAqL1xuICBjb21iaW5lRmxhZ0FuZE9wdGlvbmFsVmFsdWUoY29tYmluZSA9IHRydWUpIHtcbiAgICB0aGlzLl9jb21iaW5lRmxhZ0FuZE9wdGlvbmFsVmFsdWUgPSAhIWNvbWJpbmU7XG4gICAgcmV0dXJuIHRoaXM7XG4gIH1cblxuICAvKipcbiAgICogQWxsb3cgdW5rbm93biBvcHRpb25zIG9uIHRoZSBjb21tYW5kIGxpbmUuXG4gICAqXG4gICAqIEBwYXJhbSB7Ym9vbGVhbn0gW2FsbG93VW5rbm93bl0gLSBpZiBgdHJ1ZWAgb3Igb21pdHRlZCwgbm8gZXJyb3Igd2lsbCBiZSB0aHJvd24gZm9yIHVua25vd24gb3B0aW9ucy5cbiAgICogQHJldHVybiB7Q29tbWFuZH0gYHRoaXNgIGNvbW1hbmQgZm9yIGNoYWluaW5nXG4gICAqL1xuICBhbGxvd1Vua25vd25PcHRpb24oYWxsb3dVbmtub3duID0gdHJ1ZSkge1xuICAgIHRoaXMuX2FsbG93VW5rbm93bk9wdGlvbiA9ICEhYWxsb3dVbmtub3duO1xuICAgIHJldHVybiB0aGlzO1xuICB9XG5cbiAgLyoqXG4gICAqIEFsbG93IGV4Y2VzcyBjb21tYW5kLWFyZ3VtZW50cyBvbiB0aGUgY29tbWFuZCBsaW5lLiBQYXNzIGZhbHNlIHRvIG1ha2UgZXhjZXNzIGFyZ3VtZW50cyBhbiBlcnJvci5cbiAgICpcbiAgICogQHBhcmFtIHtib29sZWFufSBbYWxsb3dFeGNlc3NdIC0gaWYgYHRydWVgIG9yIG9taXR0ZWQsIG5vIGVycm9yIHdpbGwgYmUgdGhyb3duIGZvciBleGNlc3MgYXJndW1lbnRzLlxuICAgKiBAcmV0dXJuIHtDb21tYW5kfSBgdGhpc2AgY29tbWFuZCBmb3IgY2hhaW5pbmdcbiAgICovXG4gIGFsbG93RXhjZXNzQXJndW1lbnRzKGFsbG93RXhjZXNzID0gdHJ1ZSkge1xuICAgIHRoaXMuX2FsbG93RXhjZXNzQXJndW1lbnRzID0gISFhbGxvd0V4Y2VzcztcbiAgICByZXR1cm4gdGhpcztcbiAgfVxuXG4gIC8qKlxuICAgKiBFbmFibGUgcG9zaXRpb25hbCBvcHRpb25zLiBQb3NpdGlvbmFsIG1lYW5zIGdsb2JhbCBvcHRpb25zIGFyZSBzcGVjaWZpZWQgYmVmb3JlIHN1YmNvbW1hbmRzIHdoaWNoIGxldHNcbiAgICogc3ViY29tbWFuZHMgcmV1c2UgdGhlIHNhbWUgb3B0aW9uIG5hbWVzLCBhbmQgYWxzbyBlbmFibGVzIHN1YmNvbW1hbmRzIHRvIHR1cm4gb24gcGFzc1Rocm91Z2hPcHRpb25zLlxuICAgKiBUaGUgZGVmYXVsdCBiZWhhdmlvdXIgaXMgbm9uLXBvc2l0aW9uYWwgYW5kIGdsb2JhbCBvcHRpb25zIG1heSBhcHBlYXIgYW55d2hlcmUgb24gdGhlIGNvbW1hbmQgbGluZS5cbiAgICpcbiAgICogQHBhcmFtIHtib29sZWFufSBbcG9zaXRpb25hbF1cbiAgICogQHJldHVybiB7Q29tbWFuZH0gYHRoaXNgIGNvbW1hbmQgZm9yIGNoYWluaW5nXG4gICAqL1xuICBlbmFibGVQb3NpdGlvbmFsT3B0aW9ucyhwb3NpdGlvbmFsID0gdHJ1ZSkge1xuICAgIHRoaXMuX2VuYWJsZVBvc2l0aW9uYWxPcHRpb25zID0gISFwb3NpdGlvbmFsO1xuICAgIHJldHVybiB0aGlzO1xuICB9XG5cbiAgLyoqXG4gICAqIFBhc3MgdGhyb3VnaCBvcHRpb25zIHRoYXQgY29tZSBhZnRlciBjb21tYW5kLWFyZ3VtZW50cyByYXRoZXIgdGhhbiB0cmVhdCB0aGVtIGFzIGNvbW1hbmQtb3B0aW9ucyxcbiAgICogc28gYWN0dWFsIGNvbW1hbmQtb3B0aW9ucyBjb21lIGJlZm9yZSBjb21tYW5kLWFyZ3VtZW50cy4gVHVybmluZyB0aGlzIG9uIGZvciBhIHN1YmNvbW1hbmQgcmVxdWlyZXNcbiAgICogcG9zaXRpb25hbCBvcHRpb25zIHRvIGhhdmUgYmVlbiBlbmFibGVkIG9uIHRoZSBwcm9ncmFtIChwYXJlbnQgY29tbWFuZHMpLlxuICAgKiBUaGUgZGVmYXVsdCBiZWhhdmlvdXIgaXMgbm9uLXBvc2l0aW9uYWwgYW5kIG9wdGlvbnMgbWF5IGFwcGVhciBiZWZvcmUgb3IgYWZ0ZXIgY29tbWFuZC1hcmd1bWVudHMuXG4gICAqXG4gICAqIEBwYXJhbSB7Ym9vbGVhbn0gW3Bhc3NUaHJvdWdoXSBmb3IgdW5rbm93biBvcHRpb25zLlxuICAgKiBAcmV0dXJuIHtDb21tYW5kfSBgdGhpc2AgY29tbWFuZCBmb3IgY2hhaW5pbmdcbiAgICovXG4gIHBhc3NUaHJvdWdoT3B0aW9ucyhwYXNzVGhyb3VnaCA9IHRydWUpIHtcbiAgICB0aGlzLl9wYXNzVGhyb3VnaE9wdGlvbnMgPSAhIXBhc3NUaHJvdWdoO1xuICAgIHRoaXMuX2NoZWNrRm9yQnJva2VuUGFzc1Rocm91Z2goKTtcbiAgICByZXR1cm4gdGhpcztcbiAgfVxuXG4gIC8qKlxuICAgKiBAcHJpdmF0ZVxuICAgKi9cblxuICBfY2hlY2tGb3JCcm9rZW5QYXNzVGhyb3VnaCgpIHtcbiAgICBpZiAoXG4gICAgICB0aGlzLnBhcmVudCAmJlxuICAgICAgdGhpcy5fcGFzc1Rocm91Z2hPcHRpb25zICYmXG4gICAgICAhdGhpcy5wYXJlbnQuX2VuYWJsZVBvc2l0aW9uYWxPcHRpb25zXG4gICAgKSB7XG4gICAgICB0aHJvdyBuZXcgRXJyb3IoXG4gICAgICAgIGBwYXNzVGhyb3VnaE9wdGlvbnMgY2Fubm90IGJlIHVzZWQgZm9yICcke3RoaXMuX25hbWV9JyB3aXRob3V0IHR1cm5pbmcgb24gZW5hYmxlUG9zaXRpb25hbE9wdGlvbnMgZm9yIHBhcmVudCBjb21tYW5kKHMpYCxcbiAgICAgICk7XG4gICAgfVxuICB9XG5cbiAgLyoqXG4gICAqIFdoZXRoZXIgdG8gc3RvcmUgb3B0aW9uIHZhbHVlcyBhcyBwcm9wZXJ0aWVzIG9uIGNvbW1hbmQgb2JqZWN0LFxuICAgKiBvciBzdG9yZSBzZXBhcmF0ZWx5IChzcGVjaWZ5IGZhbHNlKS4gSW4gYm90aCBjYXNlcyB0aGUgb3B0aW9uIHZhbHVlcyBjYW4gYmUgYWNjZXNzZWQgdXNpbmcgLm9wdHMoKS5cbiAgICpcbiAgICogQHBhcmFtIHtib29sZWFufSBbc3RvcmVBc1Byb3BlcnRpZXM9dHJ1ZV1cbiAgICogQHJldHVybiB7Q29tbWFuZH0gYHRoaXNgIGNvbW1hbmQgZm9yIGNoYWluaW5nXG4gICAqL1xuXG4gIHN0b3JlT3B0aW9uc0FzUHJvcGVydGllcyhzdG9yZUFzUHJvcGVydGllcyA9IHRydWUpIHtcbiAgICBpZiAodGhpcy5vcHRpb25zLmxlbmd0aCkge1xuICAgICAgdGhyb3cgbmV3IEVycm9yKCdjYWxsIC5zdG9yZU9wdGlvbnNBc1Byb3BlcnRpZXMoKSBiZWZvcmUgYWRkaW5nIG9wdGlvbnMnKTtcbiAgICB9XG4gICAgaWYgKE9iamVjdC5rZXlzKHRoaXMuX29wdGlvblZhbHVlcykubGVuZ3RoKSB7XG4gICAgICB0aHJvdyBuZXcgRXJyb3IoXG4gICAgICAgICdjYWxsIC5zdG9yZU9wdGlvbnNBc1Byb3BlcnRpZXMoKSBiZWZvcmUgc2V0dGluZyBvcHRpb24gdmFsdWVzJyxcbiAgICAgICk7XG4gICAgfVxuICAgIHRoaXMuX3N0b3JlT3B0aW9uc0FzUHJvcGVydGllcyA9ICEhc3RvcmVBc1Byb3BlcnRpZXM7XG4gICAgcmV0dXJuIHRoaXM7XG4gIH1cblxuICAvKipcbiAgICogUmV0cmlldmUgb3B0aW9uIHZhbHVlLlxuICAgKlxuICAgKiBAcGFyYW0ge3N0cmluZ30ga2V5XG4gICAqIEByZXR1cm4ge29iamVjdH0gdmFsdWVcbiAgICovXG5cbiAgZ2V0T3B0aW9uVmFsdWUoa2V5KSB7XG4gICAgaWYgKHRoaXMuX3N0b3JlT3B0aW9uc0FzUHJvcGVydGllcykge1xuICAgICAgcmV0dXJuIHRoaXNba2V5XTtcbiAgICB9XG4gICAgcmV0dXJuIHRoaXMuX29wdGlvblZhbHVlc1trZXldO1xuICB9XG5cbiAgLyoqXG4gICAqIFN0b3JlIG9wdGlvbiB2YWx1ZS5cbiAgICpcbiAgICogQHBhcmFtIHtzdHJpbmd9IGtleVxuICAgKiBAcGFyYW0ge29iamVjdH0gdmFsdWVcbiAgICogQHJldHVybiB7Q29tbWFuZH0gYHRoaXNgIGNvbW1hbmQgZm9yIGNoYWluaW5nXG4gICAqL1xuXG4gIHNldE9wdGlvblZhbHVlKGtleSwgdmFsdWUpIHtcbiAgICByZXR1cm4gdGhpcy5zZXRPcHRpb25WYWx1ZVdpdGhTb3VyY2Uoa2V5LCB2YWx1ZSwgdW5kZWZpbmVkKTtcbiAgfVxuXG4gIC8qKlxuICAgKiBTdG9yZSBvcHRpb24gdmFsdWUgYW5kIHdoZXJlIHRoZSB2YWx1ZSBjYW1lIGZyb20uXG4gICAqXG4gICAqIEBwYXJhbSB7c3RyaW5nfSBrZXlcbiAgICogQHBhcmFtIHtvYmplY3R9IHZhbHVlXG4gICAqIEBwYXJhbSB7c3RyaW5nfSBzb3VyY2UgLSBleHBlY3RlZCB2YWx1ZXMgYXJlIGRlZmF1bHQvY29uZmlnL2Vudi9jbGkvaW1wbGllZFxuICAgKiBAcmV0dXJuIHtDb21tYW5kfSBgdGhpc2AgY29tbWFuZCBmb3IgY2hhaW5pbmdcbiAgICovXG5cbiAgc2V0T3B0aW9uVmFsdWVXaXRoU291cmNlKGtleSwgdmFsdWUsIHNvdXJjZSkge1xuICAgIGlmICh0aGlzLl9zdG9yZU9wdGlvbnNBc1Byb3BlcnRpZXMpIHtcbiAgICAgIHRoaXNba2V5XSA9IHZhbHVlO1xuICAgIH0gZWxzZSB7XG4gICAgICB0aGlzLl9vcHRpb25WYWx1ZXNba2V5XSA9IHZhbHVlO1xuICAgIH1cbiAgICB0aGlzLl9vcHRpb25WYWx1ZVNvdXJjZXNba2V5XSA9IHNvdXJjZTtcbiAgICByZXR1cm4gdGhpcztcbiAgfVxuXG4gIC8qKlxuICAgKiBHZXQgc291cmNlIG9mIG9wdGlvbiB2YWx1ZS5cbiAgICogRXhwZWN0ZWQgdmFsdWVzIGFyZSBkZWZhdWx0IHwgY29uZmlnIHwgZW52IHwgY2xpIHwgaW1wbGllZFxuICAgKlxuICAgKiBAcGFyYW0ge3N0cmluZ30ga2V5XG4gICAqIEByZXR1cm4ge3N0cmluZ31cbiAgICovXG5cbiAgZ2V0T3B0aW9uVmFsdWVTb3VyY2Uoa2V5KSB7XG4gICAgcmV0dXJuIHRoaXMuX29wdGlvblZhbHVlU291cmNlc1trZXldO1xuICB9XG5cbiAgLyoqXG4gICAqIEdldCBzb3VyY2Ugb2Ygb3B0aW9uIHZhbHVlLiBTZWUgYWxzbyAub3B0c1dpdGhHbG9iYWxzKCkuXG4gICAqIEV4cGVjdGVkIHZhbHVlcyBhcmUgZGVmYXVsdCB8IGNvbmZpZyB8IGVudiB8IGNsaSB8IGltcGxpZWRcbiAgICpcbiAgICogQHBhcmFtIHtzdHJpbmd9IGtleVxuICAgKiBAcmV0dXJuIHtzdHJpbmd9XG4gICAqL1xuXG4gIGdldE9wdGlvblZhbHVlU291cmNlV2l0aEdsb2JhbHMoa2V5KSB7XG4gICAgLy8gZ2xvYmFsIG92ZXJ3cml0ZXMgbG9jYWwsIGxpa2Ugb3B0c1dpdGhHbG9iYWxzXG4gICAgbGV0IHNvdXJjZTtcbiAgICB0aGlzLl9nZXRDb21tYW5kQW5kQW5jZXN0b3JzKCkuZm9yRWFjaCgoY21kKSA9PiB7XG4gICAgICBpZiAoY21kLmdldE9wdGlvblZhbHVlU291cmNlKGtleSkgIT09IHVuZGVmaW5lZCkge1xuICAgICAgICBzb3VyY2UgPSBjbWQuZ2V0T3B0aW9uVmFsdWVTb3VyY2Uoa2V5KTtcbiAgICAgIH1cbiAgICB9KTtcbiAgICByZXR1cm4gc291cmNlO1xuICB9XG5cbiAgLyoqXG4gICAqIEdldCB1c2VyIGFyZ3VtZW50cyBmcm9tIGltcGxpZWQgb3IgZXhwbGljaXQgYXJndW1lbnRzLlxuICAgKiBTaWRlLWVmZmVjdHM6IHNldCBfc2NyaXB0UGF0aCBpZiBhcmdzIGluY2x1ZGVkIHNjcmlwdC4gVXNlZCBmb3IgZGVmYXVsdCBwcm9ncmFtIG5hbWUsIGFuZCBzdWJjb21tYW5kIHNlYXJjaGVzLlxuICAgKlxuICAgKiBAcHJpdmF0ZVxuICAgKi9cblxuICBfcHJlcGFyZVVzZXJBcmdzKGFyZ3YsIHBhcnNlT3B0aW9ucykge1xuICAgIGlmIChhcmd2ICE9PSB1bmRlZmluZWQgJiYgIUFycmF5LmlzQXJyYXkoYXJndikpIHtcbiAgICAgIHRocm93IG5ldyBFcnJvcignZmlyc3QgcGFyYW1ldGVyIHRvIHBhcnNlIG11c3QgYmUgYXJyYXkgb3IgdW5kZWZpbmVkJyk7XG4gICAgfVxuICAgIHBhcnNlT3B0aW9ucyA9IHBhcnNlT3B0aW9ucyB8fCB7fTtcblxuICAgIC8vIGF1dG8tZGV0ZWN0IGFyZ3VtZW50IGNvbnZlbnRpb25zIGlmIG5vdGhpbmcgc3VwcGxpZWRcbiAgICBpZiAoYXJndiA9PT0gdW5kZWZpbmVkICYmIHBhcnNlT3B0aW9ucy5mcm9tID09PSB1bmRlZmluZWQpIHtcbiAgICAgIGlmIChwcm9jZXNzLnZlcnNpb25zPy5lbGVjdHJvbikge1xuICAgICAgICBwYXJzZU9wdGlvbnMuZnJvbSA9ICdlbGVjdHJvbic7XG4gICAgICB9XG4gICAgICAvLyBjaGVjayBub2RlIHNwZWNpZmljIG9wdGlvbnMgZm9yIHNjZW5hcmlvcyB3aGVyZSB1c2VyIENMSSBhcmdzIGZvbGxvdyBleGVjdXRhYmxlIHdpdGhvdXQgc2NyaXB0bmFtZVxuICAgICAgY29uc3QgZXhlY0FyZ3YgPSBwcm9jZXNzLmV4ZWNBcmd2ID8/IFtdO1xuICAgICAgaWYgKFxuICAgICAgICBleGVjQXJndi5pbmNsdWRlcygnLWUnKSB8fFxuICAgICAgICBleGVjQXJndi5pbmNsdWRlcygnLS1ldmFsJykgfHxcbiAgICAgICAgZXhlY0FyZ3YuaW5jbHVkZXMoJy1wJykgfHxcbiAgICAgICAgZXhlY0FyZ3YuaW5jbHVkZXMoJy0tcHJpbnQnKVxuICAgICAgKSB7XG4gICAgICAgIHBhcnNlT3B0aW9ucy5mcm9tID0gJ2V2YWwnOyAvLyBpbnRlcm5hbCB1c2FnZSwgbm90IGRvY3VtZW50ZWRcbiAgICAgIH1cbiAgICB9XG5cbiAgICAvLyBkZWZhdWx0IHRvIHVzaW5nIHByb2Nlc3MuYXJndlxuICAgIGlmIChhcmd2ID09PSB1bmRlZmluZWQpIHtcbiAgICAgIGFyZ3YgPSBwcm9jZXNzLmFyZ3Y7XG4gICAgfVxuICAgIHRoaXMucmF3QXJncyA9IGFyZ3Yuc2xpY2UoKTtcblxuICAgIC8vIGV4dHJhY3QgdGhlIHVzZXIgYXJncyBhbmQgc2NyaXB0UGF0aFxuICAgIGxldCB1c2VyQXJncztcbiAgICBzd2l0Y2ggKHBhcnNlT3B0aW9ucy5mcm9tKSB7XG4gICAgICBjYXNlIHVuZGVmaW5lZDpcbiAgICAgIGNhc2UgJ25vZGUnOlxuICAgICAgICB0aGlzLl9zY3JpcHRQYXRoID0gYXJndlsxXTtcbiAgICAgICAgdXNlckFyZ3MgPSBhcmd2LnNsaWNlKDIpO1xuICAgICAgICBicmVhaztcbiAgICAgIGNhc2UgJ2VsZWN0cm9uJzpcbiAgICAgICAgLy8gQHRzLWlnbm9yZTogYmVjYXVzZSBkZWZhdWx0QXBwIGlzIGFuIHVua25vd24gcHJvcGVydHlcbiAgICAgICAgaWYgKHByb2Nlc3MuZGVmYXVsdEFwcCkge1xuICAgICAgICAgIHRoaXMuX3NjcmlwdFBhdGggPSBhcmd2WzFdO1xuICAgICAgICAgIHVzZXJBcmdzID0gYXJndi5zbGljZSgyKTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICB1c2VyQXJncyA9IGFyZ3Yuc2xpY2UoMSk7XG4gICAgICAgIH1cbiAgICAgICAgYnJlYWs7XG4gICAgICBjYXNlICd1c2VyJzpcbiAgICAgICAgdXNlckFyZ3MgPSBhcmd2LnNsaWNlKDApO1xuICAgICAgICBicmVhaztcbiAgICAgIGNhc2UgJ2V2YWwnOlxuICAgICAgICB1c2VyQXJncyA9IGFyZ3Yuc2xpY2UoMSk7XG4gICAgICAgIGJyZWFrO1xuICAgICAgZGVmYXVsdDpcbiAgICAgICAgdGhyb3cgbmV3IEVycm9yKFxuICAgICAgICAgIGB1bmV4cGVjdGVkIHBhcnNlIG9wdGlvbiB7IGZyb206ICcke3BhcnNlT3B0aW9ucy5mcm9tfScgfWAsXG4gICAgICAgICk7XG4gICAgfVxuXG4gICAgLy8gRmluZCBkZWZhdWx0IG5hbWUgZm9yIHByb2dyYW0gZnJvbSBhcmd1bWVudHMuXG4gICAgaWYgKCF0aGlzLl9uYW1lICYmIHRoaXMuX3NjcmlwdFBhdGgpXG4gICAgICB0aGlzLm5hbWVGcm9tRmlsZW5hbWUodGhpcy5fc2NyaXB0UGF0aCk7XG4gICAgdGhpcy5fbmFtZSA9IHRoaXMuX25hbWUgfHwgJ3Byb2dyYW0nO1xuXG4gICAgcmV0dXJuIHVzZXJBcmdzO1xuICB9XG5cbiAgLyoqXG4gICAqIFBhcnNlIGBhcmd2YCwgc2V0dGluZyBvcHRpb25zIGFuZCBpbnZva2luZyBjb21tYW5kcyB3aGVuIGRlZmluZWQuXG4gICAqXG4gICAqIFVzZSBwYXJzZUFzeW5jIGluc3RlYWQgb2YgcGFyc2UgaWYgYW55IG9mIHlvdXIgYWN0aW9uIGhhbmRsZXJzIGFyZSBhc3luYy5cbiAgICpcbiAgICogQ2FsbCB3aXRoIG5vIHBhcmFtZXRlcnMgdG8gcGFyc2UgYHByb2Nlc3MuYXJndmAuIERldGVjdHMgRWxlY3Ryb24gYW5kIHNwZWNpYWwgbm9kZSBvcHRpb25zIGxpa2UgYG5vZGUgLS1ldmFsYC4gRWFzeSBtb2RlIVxuICAgKlxuICAgKiBPciBjYWxsIHdpdGggYW4gYXJyYXkgb2Ygc3RyaW5ncyB0byBwYXJzZSwgYW5kIG9wdGlvbmFsbHkgd2hlcmUgdGhlIHVzZXIgYXJndW1lbnRzIHN0YXJ0IGJ5IHNwZWNpZnlpbmcgd2hlcmUgdGhlIGFyZ3VtZW50cyBhcmUgYGZyb21gOlxuICAgKiAtIGAnbm9kZSdgOiBkZWZhdWx0LCBgYXJndlswXWAgaXMgdGhlIGFwcGxpY2F0aW9uIGFuZCBgYXJndlsxXWAgaXMgdGhlIHNjcmlwdCBiZWluZyBydW4sIHdpdGggdXNlciBhcmd1bWVudHMgYWZ0ZXIgdGhhdFxuICAgKiAtIGAnZWxlY3Ryb24nYDogYGFyZ3ZbMF1gIGlzIHRoZSBhcHBsaWNhdGlvbiBhbmQgYGFyZ3ZbMV1gIHZhcmllcyBkZXBlbmRpbmcgb24gd2hldGhlciB0aGUgZWxlY3Ryb24gYXBwbGljYXRpb24gaXMgcGFja2FnZWRcbiAgICogLSBgJ3VzZXInYDoganVzdCB1c2VyIGFyZ3VtZW50c1xuICAgKlxuICAgKiBAZXhhbXBsZVxuICAgKiBwcm9ncmFtLnBhcnNlKCk7IC8vIHBhcnNlIHByb2Nlc3MuYXJndiBhbmQgYXV0by1kZXRlY3QgZWxlY3Ryb24gYW5kIHNwZWNpYWwgbm9kZSBmbGFnc1xuICAgKiBwcm9ncmFtLnBhcnNlKHByb2Nlc3MuYXJndik7IC8vIGFzc3VtZSBhcmd2WzBdIGlzIGFwcCBhbmQgYXJndlsxXSBpcyBzY3JpcHRcbiAgICogcHJvZ3JhbS5wYXJzZShteS1hcmdzLCB7IGZyb206ICd1c2VyJyB9KTsgLy8ganVzdCB1c2VyIHN1cHBsaWVkIGFyZ3VtZW50cywgbm90aGluZyBzcGVjaWFsIGFib3V0IGFyZ3ZbMF1cbiAgICpcbiAgICogQHBhcmFtIHtzdHJpbmdbXX0gW2FyZ3ZdIC0gb3B0aW9uYWwsIGRlZmF1bHRzIHRvIHByb2Nlc3MuYXJndlxuICAgKiBAcGFyYW0ge29iamVjdH0gW3BhcnNlT3B0aW9uc10gLSBvcHRpb25hbGx5IHNwZWNpZnkgc3R5bGUgb2Ygb3B0aW9ucyB3aXRoIGZyb206IG5vZGUvdXNlci9lbGVjdHJvblxuICAgKiBAcGFyYW0ge3N0cmluZ30gW3BhcnNlT3B0aW9ucy5mcm9tXSAtIHdoZXJlIHRoZSBhcmdzIGFyZSBmcm9tOiAnbm9kZScsICd1c2VyJywgJ2VsZWN0cm9uJ1xuICAgKiBAcmV0dXJuIHtDb21tYW5kfSBgdGhpc2AgY29tbWFuZCBmb3IgY2hhaW5pbmdcbiAgICovXG5cbiAgcGFyc2UoYXJndiwgcGFyc2VPcHRpb25zKSB7XG4gICAgY29uc3QgdXNlckFyZ3MgPSB0aGlzLl9wcmVwYXJlVXNlckFyZ3MoYXJndiwgcGFyc2VPcHRpb25zKTtcbiAgICB0aGlzLl9wYXJzZUNvbW1hbmQoW10sIHVzZXJBcmdzKTtcblxuICAgIHJldHVybiB0aGlzO1xuICB9XG5cbiAgLyoqXG4gICAqIFBhcnNlIGBhcmd2YCwgc2V0dGluZyBvcHRpb25zIGFuZCBpbnZva2luZyBjb21tYW5kcyB3aGVuIGRlZmluZWQuXG4gICAqXG4gICAqIENhbGwgd2l0aCBubyBwYXJhbWV0ZXJzIHRvIHBhcnNlIGBwcm9jZXNzLmFyZ3ZgLiBEZXRlY3RzIEVsZWN0cm9uIGFuZCBzcGVjaWFsIG5vZGUgb3B0aW9ucyBsaWtlIGBub2RlIC0tZXZhbGAuIEVhc3kgbW9kZSFcbiAgICpcbiAgICogT3IgY2FsbCB3aXRoIGFuIGFycmF5IG9mIHN0cmluZ3MgdG8gcGFyc2UsIGFuZCBvcHRpb25hbGx5IHdoZXJlIHRoZSB1c2VyIGFyZ3VtZW50cyBzdGFydCBieSBzcGVjaWZ5aW5nIHdoZXJlIHRoZSBhcmd1bWVudHMgYXJlIGBmcm9tYDpcbiAgICogLSBgJ25vZGUnYDogZGVmYXVsdCwgYGFyZ3ZbMF1gIGlzIHRoZSBhcHBsaWNhdGlvbiBhbmQgYGFyZ3ZbMV1gIGlzIHRoZSBzY3JpcHQgYmVpbmcgcnVuLCB3aXRoIHVzZXIgYXJndW1lbnRzIGFmdGVyIHRoYXRcbiAgICogLSBgJ2VsZWN0cm9uJ2A6IGBhcmd2WzBdYCBpcyB0aGUgYXBwbGljYXRpb24gYW5kIGBhcmd2WzFdYCB2YXJpZXMgZGVwZW5kaW5nIG9uIHdoZXRoZXIgdGhlIGVsZWN0cm9uIGFwcGxpY2F0aW9uIGlzIHBhY2thZ2VkXG4gICAqIC0gYCd1c2VyJ2A6IGp1c3QgdXNlciBhcmd1bWVudHNcbiAgICpcbiAgICogQGV4YW1wbGVcbiAgICogYXdhaXQgcHJvZ3JhbS5wYXJzZUFzeW5jKCk7IC8vIHBhcnNlIHByb2Nlc3MuYXJndiBhbmQgYXV0by1kZXRlY3QgZWxlY3Ryb24gYW5kIHNwZWNpYWwgbm9kZSBmbGFnc1xuICAgKiBhd2FpdCBwcm9ncmFtLnBhcnNlQXN5bmMocHJvY2Vzcy5hcmd2KTsgLy8gYXNzdW1lIGFyZ3ZbMF0gaXMgYXBwIGFuZCBhcmd2WzFdIGlzIHNjcmlwdFxuICAgKiBhd2FpdCBwcm9ncmFtLnBhcnNlQXN5bmMobXktYXJncywgeyBmcm9tOiAndXNlcicgfSk7IC8vIGp1c3QgdXNlciBzdXBwbGllZCBhcmd1bWVudHMsIG5vdGhpbmcgc3BlY2lhbCBhYm91dCBhcmd2WzBdXG4gICAqXG4gICAqIEBwYXJhbSB7c3RyaW5nW119IFthcmd2XVxuICAgKiBAcGFyYW0ge29iamVjdH0gW3BhcnNlT3B0aW9uc11cbiAgICogQHBhcmFtIHtzdHJpbmd9IHBhcnNlT3B0aW9ucy5mcm9tIC0gd2hlcmUgdGhlIGFyZ3MgYXJlIGZyb206ICdub2RlJywgJ3VzZXInLCAnZWxlY3Ryb24nXG4gICAqIEByZXR1cm4ge1Byb21pc2V9XG4gICAqL1xuXG4gIGFzeW5jIHBhcnNlQXN5bmMoYXJndiwgcGFyc2VPcHRpb25zKSB7XG4gICAgY29uc3QgdXNlckFyZ3MgPSB0aGlzLl9wcmVwYXJlVXNlckFyZ3MoYXJndiwgcGFyc2VPcHRpb25zKTtcbiAgICBhd2FpdCB0aGlzLl9wYXJzZUNvbW1hbmQoW10sIHVzZXJBcmdzKTtcblxuICAgIHJldHVybiB0aGlzO1xuICB9XG5cbiAgLyoqXG4gICAqIEV4ZWN1dGUgYSBzdWItY29tbWFuZCBleGVjdXRhYmxlLlxuICAgKlxuICAgKiBAcHJpdmF0ZVxuICAgKi9cblxuICBfZXhlY3V0ZVN1YkNvbW1hbmQoc3ViY29tbWFuZCwgYXJncykge1xuICAgIGFyZ3MgPSBhcmdzLnNsaWNlKCk7XG4gICAgbGV0IGxhdW5jaFdpdGhOb2RlID0gZmFsc2U7IC8vIFVzZSBub2RlIGZvciBzb3VyY2UgdGFyZ2V0cyBzbyBkbyBub3QgbmVlZCB0byBnZXQgcGVybWlzc2lvbnMgY29ycmVjdCwgYW5kIG9uIFdpbmRvd3MuXG4gICAgY29uc3Qgc291cmNlRXh0ID0gWycuanMnLCAnLnRzJywgJy50c3gnLCAnLm1qcycsICcuY2pzJ107XG5cbiAgICBmdW5jdGlvbiBmaW5kRmlsZShiYXNlRGlyLCBiYXNlTmFtZSkge1xuICAgICAgLy8gTG9vayBmb3Igc3BlY2lmaWVkIGZpbGVcbiAgICAgIGNvbnN0IGxvY2FsQmluID0gcGF0aC5yZXNvbHZlKGJhc2VEaXIsIGJhc2VOYW1lKTtcbiAgICAgIGlmIChmcy5leGlzdHNTeW5jKGxvY2FsQmluKSkgcmV0dXJuIGxvY2FsQmluO1xuXG4gICAgICAvLyBTdG9wIGxvb2tpbmcgaWYgY2FuZGlkYXRlIGFscmVhZHkgaGFzIGFuIGV4cGVjdGVkIGV4dGVuc2lvbi5cbiAgICAgIGlmIChzb3VyY2VFeHQuaW5jbHVkZXMocGF0aC5leHRuYW1lKGJhc2VOYW1lKSkpIHJldHVybiB1bmRlZmluZWQ7XG5cbiAgICAgIC8vIFRyeSBhbGwgdGhlIGV4dGVuc2lvbnMuXG4gICAgICBjb25zdCBmb3VuZEV4dCA9IHNvdXJjZUV4dC5maW5kKChleHQpID0+XG4gICAgICAgIGZzLmV4aXN0c1N5bmMoYCR7bG9jYWxCaW59JHtleHR9YCksXG4gICAgICApO1xuICAgICAgaWYgKGZvdW5kRXh0KSByZXR1cm4gYCR7bG9jYWxCaW59JHtmb3VuZEV4dH1gO1xuXG4gICAgICByZXR1cm4gdW5kZWZpbmVkO1xuICAgIH1cblxuICAgIC8vIE5vdCBjaGVja2luZyBmb3IgaGVscCBmaXJzdC4gVW5saWtlbHkgdG8gaGF2ZSBtYW5kYXRvcnkgYW5kIGV4ZWN1dGFibGUsIGFuZCBjYW4ndCByb2J1c3RseSB0ZXN0IGZvciBoZWxwIGZsYWdzIGluIGV4dGVybmFsIGNvbW1hbmQuXG4gICAgdGhpcy5fY2hlY2tGb3JNaXNzaW5nTWFuZGF0b3J5T3B0aW9ucygpO1xuICAgIHRoaXMuX2NoZWNrRm9yQ29uZmxpY3RpbmdPcHRpb25zKCk7XG5cbiAgICAvLyBleGVjdXRhYmxlRmlsZSBhbmQgZXhlY3V0YWJsZURpciBtaWdodCBiZSBmdWxsIHBhdGgsIG9yIGp1c3QgYSBuYW1lXG4gICAgbGV0IGV4ZWN1dGFibGVGaWxlID1cbiAgICAgIHN1YmNvbW1hbmQuX2V4ZWN1dGFibGVGaWxlIHx8IGAke3RoaXMuX25hbWV9LSR7c3ViY29tbWFuZC5fbmFtZX1gO1xuICAgIGxldCBleGVjdXRhYmxlRGlyID0gdGhpcy5fZXhlY3V0YWJsZURpciB8fCAnJztcbiAgICBpZiAodGhpcy5fc2NyaXB0UGF0aCkge1xuICAgICAgbGV0IHJlc29sdmVkU2NyaXB0UGF0aDsgLy8gcmVzb2x2ZSBwb3NzaWJsZSBzeW1saW5rIGZvciBpbnN0YWxsZWQgbnBtIGJpbmFyeVxuICAgICAgdHJ5IHtcbiAgICAgICAgcmVzb2x2ZWRTY3JpcHRQYXRoID0gZnMucmVhbHBhdGhTeW5jKHRoaXMuX3NjcmlwdFBhdGgpO1xuICAgICAgfSBjYXRjaCAoZXJyKSB7XG4gICAgICAgIHJlc29sdmVkU2NyaXB0UGF0aCA9IHRoaXMuX3NjcmlwdFBhdGg7XG4gICAgICB9XG4gICAgICBleGVjdXRhYmxlRGlyID0gcGF0aC5yZXNvbHZlKFxuICAgICAgICBwYXRoLmRpcm5hbWUocmVzb2x2ZWRTY3JpcHRQYXRoKSxcbiAgICAgICAgZXhlY3V0YWJsZURpcixcbiAgICAgICk7XG4gICAgfVxuXG4gICAgLy8gTG9vayBmb3IgYSBsb2NhbCBmaWxlIGluIHByZWZlcmVuY2UgdG8gYSBjb21tYW5kIGluIFBBVEguXG4gICAgaWYgKGV4ZWN1dGFibGVEaXIpIHtcbiAgICAgIGxldCBsb2NhbEZpbGUgPSBmaW5kRmlsZShleGVjdXRhYmxlRGlyLCBleGVjdXRhYmxlRmlsZSk7XG5cbiAgICAgIC8vIExlZ2FjeSBzZWFyY2ggdXNpbmcgcHJlZml4IG9mIHNjcmlwdCBuYW1lIGluc3RlYWQgb2YgY29tbWFuZCBuYW1lXG4gICAgICBpZiAoIWxvY2FsRmlsZSAmJiAhc3ViY29tbWFuZC5fZXhlY3V0YWJsZUZpbGUgJiYgdGhpcy5fc2NyaXB0UGF0aCkge1xuICAgICAgICBjb25zdCBsZWdhY3lOYW1lID0gcGF0aC5iYXNlbmFtZShcbiAgICAgICAgICB0aGlzLl9zY3JpcHRQYXRoLFxuICAgICAgICAgIHBhdGguZXh0bmFtZSh0aGlzLl9zY3JpcHRQYXRoKSxcbiAgICAgICAgKTtcbiAgICAgICAgaWYgKGxlZ2FjeU5hbWUgIT09IHRoaXMuX25hbWUpIHtcbiAgICAgICAgICBsb2NhbEZpbGUgPSBmaW5kRmlsZShcbiAgICAgICAgICAgIGV4ZWN1dGFibGVEaXIsXG4gICAgICAgICAgICBgJHtsZWdhY3lOYW1lfS0ke3N1YmNvbW1hbmQuX25hbWV9YCxcbiAgICAgICAgICApO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgICBleGVjdXRhYmxlRmlsZSA9IGxvY2FsRmlsZSB8fCBleGVjdXRhYmxlRmlsZTtcbiAgICB9XG5cbiAgICBsYXVuY2hXaXRoTm9kZSA9IHNvdXJjZUV4dC5pbmNsdWRlcyhwYXRoLmV4dG5hbWUoZXhlY3V0YWJsZUZpbGUpKTtcblxuICAgIGxldCBwcm9jO1xuICAgIGlmIChwcm9jZXNzLnBsYXRmb3JtICE9PSAnd2luMzInKSB7XG4gICAgICBpZiAobGF1bmNoV2l0aE5vZGUpIHtcbiAgICAgICAgYXJncy51bnNoaWZ0KGV4ZWN1dGFibGVGaWxlKTtcbiAgICAgICAgLy8gYWRkIGV4ZWN1dGFibGUgYXJndW1lbnRzIHRvIHNwYXduXG4gICAgICAgIGFyZ3MgPSBpbmNyZW1lbnROb2RlSW5zcGVjdG9yUG9ydChwcm9jZXNzLmV4ZWNBcmd2KS5jb25jYXQoYXJncyk7XG5cbiAgICAgICAgcHJvYyA9IGNoaWxkUHJvY2Vzcy5zcGF3bihwcm9jZXNzLmFyZ3ZbMF0sIGFyZ3MsIHsgc3RkaW86ICdpbmhlcml0JyB9KTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIHByb2MgPSBjaGlsZFByb2Nlc3Muc3Bhd24oZXhlY3V0YWJsZUZpbGUsIGFyZ3MsIHsgc3RkaW86ICdpbmhlcml0JyB9KTtcbiAgICAgIH1cbiAgICB9IGVsc2Uge1xuICAgICAgYXJncy51bnNoaWZ0KGV4ZWN1dGFibGVGaWxlKTtcbiAgICAgIC8vIGFkZCBleGVjdXRhYmxlIGFyZ3VtZW50cyB0byBzcGF3blxuICAgICAgYXJncyA9IGluY3JlbWVudE5vZGVJbnNwZWN0b3JQb3J0KHByb2Nlc3MuZXhlY0FyZ3YpLmNvbmNhdChhcmdzKTtcbiAgICAgIHByb2MgPSBjaGlsZFByb2Nlc3Muc3Bhd24ocHJvY2Vzcy5leGVjUGF0aCwgYXJncywgeyBzdGRpbzogJ2luaGVyaXQnIH0pO1xuICAgIH1cblxuICAgIGlmICghcHJvYy5raWxsZWQpIHtcbiAgICAgIC8vIHRlc3RpbmcgbWFpbmx5IHRvIGF2b2lkIGxlYWsgd2FybmluZ3MgZHVyaW5nIHVuaXQgdGVzdHMgd2l0aCBtb2NrZWQgc3Bhd25cbiAgICAgIGNvbnN0IHNpZ25hbHMgPSBbJ1NJR1VTUjEnLCAnU0lHVVNSMicsICdTSUdURVJNJywgJ1NJR0lOVCcsICdTSUdIVVAnXTtcbiAgICAgIHNpZ25hbHMuZm9yRWFjaCgoc2lnbmFsKSA9PiB7XG4gICAgICAgIHByb2Nlc3Mub24oc2lnbmFsLCAoKSA9PiB7XG4gICAgICAgICAgaWYgKHByb2Mua2lsbGVkID09PSBmYWxzZSAmJiBwcm9jLmV4aXRDb2RlID09PSBudWxsKSB7XG4gICAgICAgICAgICAvLyBAdHMtaWdub3JlIGJlY2F1c2Ugc2lnbmFscyBub3QgdHlwZWQgdG8ga25vd24gc3RyaW5nc1xuICAgICAgICAgICAgcHJvYy5raWxsKHNpZ25hbCk7XG4gICAgICAgICAgfVxuICAgICAgICB9KTtcbiAgICAgIH0pO1xuICAgIH1cblxuICAgIC8vIEJ5IGRlZmF1bHQgdGVybWluYXRlIHByb2Nlc3Mgd2hlbiBzcGF3bmVkIHByb2Nlc3MgdGVybWluYXRlcy5cbiAgICBjb25zdCBleGl0Q2FsbGJhY2sgPSB0aGlzLl9leGl0Q2FsbGJhY2s7XG4gICAgcHJvYy5vbignY2xvc2UnLCAoY29kZSkgPT4ge1xuICAgICAgY29kZSA9IGNvZGUgPz8gMTsgLy8gY29kZSBpcyBudWxsIGlmIHNwYXduZWQgcHJvY2VzcyB0ZXJtaW5hdGVkIGR1ZSB0byBhIHNpZ25hbFxuICAgICAgaWYgKCFleGl0Q2FsbGJhY2spIHtcbiAgICAgICAgcHJvY2Vzcy5leGl0KGNvZGUpO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgZXhpdENhbGxiYWNrKFxuICAgICAgICAgIG5ldyBDb21tYW5kZXJFcnJvcihcbiAgICAgICAgICAgIGNvZGUsXG4gICAgICAgICAgICAnY29tbWFuZGVyLmV4ZWN1dGVTdWJDb21tYW5kQXN5bmMnLFxuICAgICAgICAgICAgJyhjbG9zZSknLFxuICAgICAgICAgICksXG4gICAgICAgICk7XG4gICAgICB9XG4gICAgfSk7XG4gICAgcHJvYy5vbignZXJyb3InLCAoZXJyKSA9PiB7XG4gICAgICAvLyBAdHMtaWdub3JlOiBiZWNhdXNlIGVyci5jb2RlIGlzIGFuIHVua25vd24gcHJvcGVydHlcbiAgICAgIGlmIChlcnIuY29kZSA9PT0gJ0VOT0VOVCcpIHtcbiAgICAgICAgY29uc3QgZXhlY3V0YWJsZURpck1lc3NhZ2UgPSBleGVjdXRhYmxlRGlyXG4gICAgICAgICAgPyBgc2VhcmNoZWQgZm9yIGxvY2FsIHN1YmNvbW1hbmQgcmVsYXRpdmUgdG8gZGlyZWN0b3J5ICcke2V4ZWN1dGFibGVEaXJ9J2BcbiAgICAgICAgICA6ICdubyBkaXJlY3RvcnkgZm9yIHNlYXJjaCBmb3IgbG9jYWwgc3ViY29tbWFuZCwgdXNlIC5leGVjdXRhYmxlRGlyKCkgdG8gc3VwcGx5IGEgY3VzdG9tIGRpcmVjdG9yeSc7XG4gICAgICAgIGNvbnN0IGV4ZWN1dGFibGVNaXNzaW5nID0gYCcke2V4ZWN1dGFibGVGaWxlfScgZG9lcyBub3QgZXhpc3RcbiAtIGlmICcke3N1YmNvbW1hbmQuX25hbWV9JyBpcyBub3QgbWVhbnQgdG8gYmUgYW4gZXhlY3V0YWJsZSBjb21tYW5kLCByZW1vdmUgZGVzY3JpcHRpb24gcGFyYW1ldGVyIGZyb20gJy5jb21tYW5kKCknIGFuZCB1c2UgJy5kZXNjcmlwdGlvbigpJyBpbnN0ZWFkXG4gLSBpZiB0aGUgZGVmYXVsdCBleGVjdXRhYmxlIG5hbWUgaXMgbm90IHN1aXRhYmxlLCB1c2UgdGhlIGV4ZWN1dGFibGVGaWxlIG9wdGlvbiB0byBzdXBwbHkgYSBjdXN0b20gbmFtZSBvciBwYXRoXG4gLSAke2V4ZWN1dGFibGVEaXJNZXNzYWdlfWA7XG4gICAgICAgIHRocm93IG5ldyBFcnJvcihleGVjdXRhYmxlTWlzc2luZyk7XG4gICAgICAgIC8vIEB0cy1pZ25vcmU6IGJlY2F1c2UgZXJyLmNvZGUgaXMgYW4gdW5rbm93biBwcm9wZXJ0eVxuICAgICAgfSBlbHNlIGlmIChlcnIuY29kZSA9PT0gJ0VBQ0NFUycpIHtcbiAgICAgICAgdGhyb3cgbmV3IEVycm9yKGAnJHtleGVjdXRhYmxlRmlsZX0nIG5vdCBleGVjdXRhYmxlYCk7XG4gICAgICB9XG4gICAgICBpZiAoIWV4aXRDYWxsYmFjaykge1xuICAgICAgICBwcm9jZXNzLmV4aXQoMSk7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICBjb25zdCB3cmFwcGVkRXJyb3IgPSBuZXcgQ29tbWFuZGVyRXJyb3IoXG4gICAgICAgICAgMSxcbiAgICAgICAgICAnY29tbWFuZGVyLmV4ZWN1dGVTdWJDb21tYW5kQXN5bmMnLFxuICAgICAgICAgICcoZXJyb3IpJyxcbiAgICAgICAgKTtcbiAgICAgICAgd3JhcHBlZEVycm9yLm5lc3RlZEVycm9yID0gZXJyO1xuICAgICAgICBleGl0Q2FsbGJhY2sod3JhcHBlZEVycm9yKTtcbiAgICAgIH1cbiAgICB9KTtcblxuICAgIC8vIFN0b3JlIHRoZSByZWZlcmVuY2UgdG8gdGhlIGNoaWxkIHByb2Nlc3NcbiAgICB0aGlzLnJ1bm5pbmdDb21tYW5kID0gcHJvYztcbiAgfVxuXG4gIC8qKlxuICAgKiBAcHJpdmF0ZVxuICAgKi9cblxuICBfZGlzcGF0Y2hTdWJjb21tYW5kKGNvbW1hbmROYW1lLCBvcGVyYW5kcywgdW5rbm93bikge1xuICAgIGNvbnN0IHN1YkNvbW1hbmQgPSB0aGlzLl9maW5kQ29tbWFuZChjb21tYW5kTmFtZSk7XG4gICAgaWYgKCFzdWJDb21tYW5kKSB0aGlzLmhlbHAoeyBlcnJvcjogdHJ1ZSB9KTtcblxuICAgIGxldCBwcm9taXNlQ2hhaW47XG4gICAgcHJvbWlzZUNoYWluID0gdGhpcy5fY2hhaW5PckNhbGxTdWJDb21tYW5kSG9vayhcbiAgICAgIHByb21pc2VDaGFpbixcbiAgICAgIHN1YkNvbW1hbmQsXG4gICAgICAncHJlU3ViY29tbWFuZCcsXG4gICAgKTtcbiAgICBwcm9taXNlQ2hhaW4gPSB0aGlzLl9jaGFpbk9yQ2FsbChwcm9taXNlQ2hhaW4sICgpID0+IHtcbiAgICAgIGlmIChzdWJDb21tYW5kLl9leGVjdXRhYmxlSGFuZGxlcikge1xuICAgICAgICB0aGlzLl9leGVjdXRlU3ViQ29tbWFuZChzdWJDb21tYW5kLCBvcGVyYW5kcy5jb25jYXQodW5rbm93bikpO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgcmV0dXJuIHN1YkNvbW1hbmQuX3BhcnNlQ29tbWFuZChvcGVyYW5kcywgdW5rbm93bik7XG4gICAgICB9XG4gICAgfSk7XG4gICAgcmV0dXJuIHByb21pc2VDaGFpbjtcbiAgfVxuXG4gIC8qKlxuICAgKiBJbnZva2UgaGVscCBkaXJlY3RseSBpZiBwb3NzaWJsZSwgb3IgZGlzcGF0Y2ggaWYgbmVjZXNzYXJ5LlxuICAgKiBlLmcuIGhlbHAgZm9vXG4gICAqXG4gICAqIEBwcml2YXRlXG4gICAqL1xuXG4gIF9kaXNwYXRjaEhlbHBDb21tYW5kKHN1YmNvbW1hbmROYW1lKSB7XG4gICAgaWYgKCFzdWJjb21tYW5kTmFtZSkge1xuICAgICAgdGhpcy5oZWxwKCk7XG4gICAgfVxuICAgIGNvbnN0IHN1YkNvbW1hbmQgPSB0aGlzLl9maW5kQ29tbWFuZChzdWJjb21tYW5kTmFtZSk7XG4gICAgaWYgKHN1YkNvbW1hbmQgJiYgIXN1YkNvbW1hbmQuX2V4ZWN1dGFibGVIYW5kbGVyKSB7XG4gICAgICBzdWJDb21tYW5kLmhlbHAoKTtcbiAgICB9XG5cbiAgICAvLyBGYWxsYmFjayB0byBwYXJzaW5nIHRoZSBoZWxwIGZsYWcgdG8gaW52b2tlIHRoZSBoZWxwLlxuICAgIHJldHVybiB0aGlzLl9kaXNwYXRjaFN1YmNvbW1hbmQoXG4gICAgICBzdWJjb21tYW5kTmFtZSxcbiAgICAgIFtdLFxuICAgICAgW3RoaXMuX2dldEhlbHBPcHRpb24oKT8ubG9uZyA/PyB0aGlzLl9nZXRIZWxwT3B0aW9uKCk/LnNob3J0ID8/ICctLWhlbHAnXSxcbiAgICApO1xuICB9XG5cbiAgLyoqXG4gICAqIENoZWNrIHRoaXMuYXJncyBhZ2FpbnN0IGV4cGVjdGVkIHRoaXMucmVnaXN0ZXJlZEFyZ3VtZW50cy5cbiAgICpcbiAgICogQHByaXZhdGVcbiAgICovXG5cbiAgX2NoZWNrTnVtYmVyT2ZBcmd1bWVudHMoKSB7XG4gICAgLy8gdG9vIGZld1xuICAgIHRoaXMucmVnaXN0ZXJlZEFyZ3VtZW50cy5mb3JFYWNoKChhcmcsIGkpID0+IHtcbiAgICAgIGlmIChhcmcucmVxdWlyZWQgJiYgdGhpcy5hcmdzW2ldID09IG51bGwpIHtcbiAgICAgICAgdGhpcy5taXNzaW5nQXJndW1lbnQoYXJnLm5hbWUoKSk7XG4gICAgICB9XG4gICAgfSk7XG4gICAgLy8gdG9vIG1hbnlcbiAgICBpZiAoXG4gICAgICB0aGlzLnJlZ2lzdGVyZWRBcmd1bWVudHMubGVuZ3RoID4gMCAmJlxuICAgICAgdGhpcy5yZWdpc3RlcmVkQXJndW1lbnRzW3RoaXMucmVnaXN0ZXJlZEFyZ3VtZW50cy5sZW5ndGggLSAxXS52YXJpYWRpY1xuICAgICkge1xuICAgICAgcmV0dXJuO1xuICAgIH1cbiAgICBpZiAodGhpcy5hcmdzLmxlbmd0aCA+IHRoaXMucmVnaXN0ZXJlZEFyZ3VtZW50cy5sZW5ndGgpIHtcbiAgICAgIHRoaXMuX2V4Y2Vzc0FyZ3VtZW50cyh0aGlzLmFyZ3MpO1xuICAgIH1cbiAgfVxuXG4gIC8qKlxuICAgKiBQcm9jZXNzIHRoaXMuYXJncyB1c2luZyB0aGlzLnJlZ2lzdGVyZWRBcmd1bWVudHMgYW5kIHNhdmUgYXMgdGhpcy5wcm9jZXNzZWRBcmdzIVxuICAgKlxuICAgKiBAcHJpdmF0ZVxuICAgKi9cblxuICBfcHJvY2Vzc0FyZ3VtZW50cygpIHtcbiAgICBjb25zdCBteVBhcnNlQXJnID0gKGFyZ3VtZW50LCB2YWx1ZSwgcHJldmlvdXMpID0+IHtcbiAgICAgIC8vIEV4dHJhIHByb2Nlc3NpbmcgZm9yIG5pY2UgZXJyb3IgbWVzc2FnZSBvbiBwYXJzaW5nIGZhaWx1cmUuXG4gICAgICBsZXQgcGFyc2VkVmFsdWUgPSB2YWx1ZTtcbiAgICAgIGlmICh2YWx1ZSAhPT0gbnVsbCAmJiBhcmd1bWVudC5wYXJzZUFyZykge1xuICAgICAgICBjb25zdCBpbnZhbGlkVmFsdWVNZXNzYWdlID0gYGVycm9yOiBjb21tYW5kLWFyZ3VtZW50IHZhbHVlICcke3ZhbHVlfScgaXMgaW52YWxpZCBmb3IgYXJndW1lbnQgJyR7YXJndW1lbnQubmFtZSgpfScuYDtcbiAgICAgICAgcGFyc2VkVmFsdWUgPSB0aGlzLl9jYWxsUGFyc2VBcmcoXG4gICAgICAgICAgYXJndW1lbnQsXG4gICAgICAgICAgdmFsdWUsXG4gICAgICAgICAgcHJldmlvdXMsXG4gICAgICAgICAgaW52YWxpZFZhbHVlTWVzc2FnZSxcbiAgICAgICAgKTtcbiAgICAgIH1cbiAgICAgIHJldHVybiBwYXJzZWRWYWx1ZTtcbiAgICB9O1xuXG4gICAgdGhpcy5fY2hlY2tOdW1iZXJPZkFyZ3VtZW50cygpO1xuXG4gICAgY29uc3QgcHJvY2Vzc2VkQXJncyA9IFtdO1xuICAgIHRoaXMucmVnaXN0ZXJlZEFyZ3VtZW50cy5mb3JFYWNoKChkZWNsYXJlZEFyZywgaW5kZXgpID0+IHtcbiAgICAgIGxldCB2YWx1ZSA9IGRlY2xhcmVkQXJnLmRlZmF1bHRWYWx1ZTtcbiAgICAgIGlmIChkZWNsYXJlZEFyZy52YXJpYWRpYykge1xuICAgICAgICAvLyBDb2xsZWN0IHRvZ2V0aGVyIHJlbWFpbmluZyBhcmd1bWVudHMgZm9yIHBhc3NpbmcgdG9nZXRoZXIgYXMgYW4gYXJyYXkuXG4gICAgICAgIGlmIChpbmRleCA8IHRoaXMuYXJncy5sZW5ndGgpIHtcbiAgICAgICAgICB2YWx1ZSA9IHRoaXMuYXJncy5zbGljZShpbmRleCk7XG4gICAgICAgICAgaWYgKGRlY2xhcmVkQXJnLnBhcnNlQXJnKSB7XG4gICAgICAgICAgICB2YWx1ZSA9IHZhbHVlLnJlZHVjZSgocHJvY2Vzc2VkLCB2KSA9PiB7XG4gICAgICAgICAgICAgIHJldHVybiBteVBhcnNlQXJnKGRlY2xhcmVkQXJnLCB2LCBwcm9jZXNzZWQpO1xuICAgICAgICAgICAgfSwgZGVjbGFyZWRBcmcuZGVmYXVsdFZhbHVlKTtcbiAgICAgICAgICB9XG4gICAgICAgIH0gZWxzZSBpZiAodmFsdWUgPT09IHVuZGVmaW5lZCkge1xuICAgICAgICAgIHZhbHVlID0gW107XG4gICAgICAgIH1cbiAgICAgIH0gZWxzZSBpZiAoaW5kZXggPCB0aGlzLmFyZ3MubGVuZ3RoKSB7XG4gICAgICAgIHZhbHVlID0gdGhpcy5hcmdzW2luZGV4XTtcbiAgICAgICAgaWYgKGRlY2xhcmVkQXJnLnBhcnNlQXJnKSB7XG4gICAgICAgICAgdmFsdWUgPSBteVBhcnNlQXJnKGRlY2xhcmVkQXJnLCB2YWx1ZSwgZGVjbGFyZWRBcmcuZGVmYXVsdFZhbHVlKTtcbiAgICAgICAgfVxuICAgICAgfVxuICAgICAgcHJvY2Vzc2VkQXJnc1tpbmRleF0gPSB2YWx1ZTtcbiAgICB9KTtcbiAgICB0aGlzLnByb2Nlc3NlZEFyZ3MgPSBwcm9jZXNzZWRBcmdzO1xuICB9XG5cbiAgLyoqXG4gICAqIE9uY2Ugd2UgaGF2ZSBhIHByb21pc2Ugd2UgY2hhaW4sIGJ1dCBjYWxsIHN5bmNocm9ub3VzbHkgdW50aWwgdGhlbi5cbiAgICpcbiAgICogQHBhcmFtIHsoUHJvbWlzZXx1bmRlZmluZWQpfSBwcm9taXNlXG4gICAqIEBwYXJhbSB7RnVuY3Rpb259IGZuXG4gICAqIEByZXR1cm4geyhQcm9taXNlfHVuZGVmaW5lZCl9XG4gICAqIEBwcml2YXRlXG4gICAqL1xuXG4gIF9jaGFpbk9yQ2FsbChwcm9taXNlLCBmbikge1xuICAgIC8vIHRoZW5hYmxlXG4gICAgaWYgKHByb21pc2UgJiYgcHJvbWlzZS50aGVuICYmIHR5cGVvZiBwcm9taXNlLnRoZW4gPT09ICdmdW5jdGlvbicpIHtcbiAgICAgIC8vIGFscmVhZHkgaGF2ZSBhIHByb21pc2UsIGNoYWluIGNhbGxiYWNrXG4gICAgICByZXR1cm4gcHJvbWlzZS50aGVuKCgpID0+IGZuKCkpO1xuICAgIH1cbiAgICAvLyBjYWxsYmFjayBtaWdodCByZXR1cm4gYSBwcm9taXNlXG4gICAgcmV0dXJuIGZuKCk7XG4gIH1cblxuICAvKipcbiAgICpcbiAgICogQHBhcmFtIHsoUHJvbWlzZXx1bmRlZmluZWQpfSBwcm9taXNlXG4gICAqIEBwYXJhbSB7c3RyaW5nfSBldmVudFxuICAgKiBAcmV0dXJuIHsoUHJvbWlzZXx1bmRlZmluZWQpfVxuICAgKiBAcHJpdmF0ZVxuICAgKi9cblxuICBfY2hhaW5PckNhbGxIb29rcyhwcm9taXNlLCBldmVudCkge1xuICAgIGxldCByZXN1bHQgPSBwcm9taXNlO1xuICAgIGNvbnN0IGhvb2tzID0gW107XG4gICAgdGhpcy5fZ2V0Q29tbWFuZEFuZEFuY2VzdG9ycygpXG4gICAgICAucmV2ZXJzZSgpXG4gICAgICAuZmlsdGVyKChjbWQpID0+IGNtZC5fbGlmZUN5Y2xlSG9va3NbZXZlbnRdICE9PSB1bmRlZmluZWQpXG4gICAgICAuZm9yRWFjaCgoaG9va2VkQ29tbWFuZCkgPT4ge1xuICAgICAgICBob29rZWRDb21tYW5kLl9saWZlQ3ljbGVIb29rc1tldmVudF0uZm9yRWFjaCgoY2FsbGJhY2spID0+IHtcbiAgICAgICAgICBob29rcy5wdXNoKHsgaG9va2VkQ29tbWFuZCwgY2FsbGJhY2sgfSk7XG4gICAgICAgIH0pO1xuICAgICAgfSk7XG4gICAgaWYgKGV2ZW50ID09PSAncG9zdEFjdGlvbicpIHtcbiAgICAgIGhvb2tzLnJldmVyc2UoKTtcbiAgICB9XG5cbiAgICBob29rcy5mb3JFYWNoKChob29rRGV0YWlsKSA9PiB7XG4gICAgICByZXN1bHQgPSB0aGlzLl9jaGFpbk9yQ2FsbChyZXN1bHQsICgpID0+IHtcbiAgICAgICAgcmV0dXJuIGhvb2tEZXRhaWwuY2FsbGJhY2soaG9va0RldGFpbC5ob29rZWRDb21tYW5kLCB0aGlzKTtcbiAgICAgIH0pO1xuICAgIH0pO1xuICAgIHJldHVybiByZXN1bHQ7XG4gIH1cblxuICAvKipcbiAgICpcbiAgICogQHBhcmFtIHsoUHJvbWlzZXx1bmRlZmluZWQpfSBwcm9taXNlXG4gICAqIEBwYXJhbSB7Q29tbWFuZH0gc3ViQ29tbWFuZFxuICAgKiBAcGFyYW0ge3N0cmluZ30gZXZlbnRcbiAgICogQHJldHVybiB7KFByb21pc2V8dW5kZWZpbmVkKX1cbiAgICogQHByaXZhdGVcbiAgICovXG5cbiAgX2NoYWluT3JDYWxsU3ViQ29tbWFuZEhvb2socHJvbWlzZSwgc3ViQ29tbWFuZCwgZXZlbnQpIHtcbiAgICBsZXQgcmVzdWx0ID0gcHJvbWlzZTtcbiAgICBpZiAodGhpcy5fbGlmZUN5Y2xlSG9va3NbZXZlbnRdICE9PSB1bmRlZmluZWQpIHtcbiAgICAgIHRoaXMuX2xpZmVDeWNsZUhvb2tzW2V2ZW50XS5mb3JFYWNoKChob29rKSA9PiB7XG4gICAgICAgIHJlc3VsdCA9IHRoaXMuX2NoYWluT3JDYWxsKHJlc3VsdCwgKCkgPT4ge1xuICAgICAgICAgIHJldHVybiBob29rKHRoaXMsIHN1YkNvbW1hbmQpO1xuICAgICAgICB9KTtcbiAgICAgIH0pO1xuICAgIH1cbiAgICByZXR1cm4gcmVzdWx0O1xuICB9XG5cbiAgLyoqXG4gICAqIFByb2Nlc3MgYXJndW1lbnRzIGluIGNvbnRleHQgb2YgdGhpcyBjb21tYW5kLlxuICAgKiBSZXR1cm5zIGFjdGlvbiByZXN1bHQsIGluIGNhc2UgaXQgaXMgYSBwcm9taXNlLlxuICAgKlxuICAgKiBAcHJpdmF0ZVxuICAgKi9cblxuICBfcGFyc2VDb21tYW5kKG9wZXJhbmRzLCB1bmtub3duKSB7XG4gICAgY29uc3QgcGFyc2VkID0gdGhpcy5wYXJzZU9wdGlvbnModW5rbm93bik7XG4gICAgdGhpcy5fcGFyc2VPcHRpb25zRW52KCk7IC8vIGFmdGVyIGNsaSwgc28gcGFyc2VBcmcgbm90IGNhbGxlZCBvbiBib3RoIGNsaSBhbmQgZW52XG4gICAgdGhpcy5fcGFyc2VPcHRpb25zSW1wbGllZCgpO1xuICAgIG9wZXJhbmRzID0gb3BlcmFuZHMuY29uY2F0KHBhcnNlZC5vcGVyYW5kcyk7XG4gICAgdW5rbm93biA9IHBhcnNlZC51bmtub3duO1xuICAgIHRoaXMuYXJncyA9IG9wZXJhbmRzLmNvbmNhdCh1bmtub3duKTtcblxuICAgIGlmIChvcGVyYW5kcyAmJiB0aGlzLl9maW5kQ29tbWFuZChvcGVyYW5kc1swXSkpIHtcbiAgICAgIHJldHVybiB0aGlzLl9kaXNwYXRjaFN1YmNvbW1hbmQob3BlcmFuZHNbMF0sIG9wZXJhbmRzLnNsaWNlKDEpLCB1bmtub3duKTtcbiAgICB9XG4gICAgaWYgKFxuICAgICAgdGhpcy5fZ2V0SGVscENvbW1hbmQoKSAmJlxuICAgICAgb3BlcmFuZHNbMF0gPT09IHRoaXMuX2dldEhlbHBDb21tYW5kKCkubmFtZSgpXG4gICAgKSB7XG4gICAgICByZXR1cm4gdGhpcy5fZGlzcGF0Y2hIZWxwQ29tbWFuZChvcGVyYW5kc1sxXSk7XG4gICAgfVxuICAgIGlmICh0aGlzLl9kZWZhdWx0Q29tbWFuZE5hbWUpIHtcbiAgICAgIHRoaXMuX291dHB1dEhlbHBJZlJlcXVlc3RlZCh1bmtub3duKTsgLy8gUnVuIHRoZSBoZWxwIGZvciBkZWZhdWx0IGNvbW1hbmQgZnJvbSBwYXJlbnQgcmF0aGVyIHRoYW4gcGFzc2luZyB0byBkZWZhdWx0IGNvbW1hbmRcbiAgICAgIHJldHVybiB0aGlzLl9kaXNwYXRjaFN1YmNvbW1hbmQoXG4gICAgICAgIHRoaXMuX2RlZmF1bHRDb21tYW5kTmFtZSxcbiAgICAgICAgb3BlcmFuZHMsXG4gICAgICAgIHVua25vd24sXG4gICAgICApO1xuICAgIH1cbiAgICBpZiAoXG4gICAgICB0aGlzLmNvbW1hbmRzLmxlbmd0aCAmJlxuICAgICAgdGhpcy5hcmdzLmxlbmd0aCA9PT0gMCAmJlxuICAgICAgIXRoaXMuX2FjdGlvbkhhbmRsZXIgJiZcbiAgICAgICF0aGlzLl9kZWZhdWx0Q29tbWFuZE5hbWVcbiAgICApIHtcbiAgICAgIC8vIHByb2JhYmx5IG1pc3Npbmcgc3ViY29tbWFuZCBhbmQgbm8gaGFuZGxlciwgdXNlciBuZWVkcyBoZWxwIChhbmQgZXhpdClcbiAgICAgIHRoaXMuaGVscCh7IGVycm9yOiB0cnVlIH0pO1xuICAgIH1cblxuICAgIHRoaXMuX291dHB1dEhlbHBJZlJlcXVlc3RlZChwYXJzZWQudW5rbm93bik7XG4gICAgdGhpcy5fY2hlY2tGb3JNaXNzaW5nTWFuZGF0b3J5T3B0aW9ucygpO1xuICAgIHRoaXMuX2NoZWNrRm9yQ29uZmxpY3RpbmdPcHRpb25zKCk7XG5cbiAgICAvLyBXZSBkbyBub3QgYWx3YXlzIGNhbGwgdGhpcyBjaGVjayB0byBhdm9pZCBtYXNraW5nIGEgXCJiZXR0ZXJcIiBlcnJvciwgbGlrZSB1bmtub3duIGNvbW1hbmQuXG4gICAgY29uc3QgY2hlY2tGb3JVbmtub3duT3B0aW9ucyA9ICgpID0+IHtcbiAgICAgIGlmIChwYXJzZWQudW5rbm93bi5sZW5ndGggPiAwKSB7XG4gICAgICAgIHRoaXMudW5rbm93bk9wdGlvbihwYXJzZWQudW5rbm93blswXSk7XG4gICAgICB9XG4gICAgfTtcblxuICAgIGNvbnN0IGNvbW1hbmRFdmVudCA9IGBjb21tYW5kOiR7dGhpcy5uYW1lKCl9YDtcbiAgICBpZiAodGhpcy5fYWN0aW9uSGFuZGxlcikge1xuICAgICAgY2hlY2tGb3JVbmtub3duT3B0aW9ucygpO1xuICAgICAgdGhpcy5fcHJvY2Vzc0FyZ3VtZW50cygpO1xuXG4gICAgICBsZXQgcHJvbWlzZUNoYWluO1xuICAgICAgcHJvbWlzZUNoYWluID0gdGhpcy5fY2hhaW5PckNhbGxIb29rcyhwcm9taXNlQ2hhaW4sICdwcmVBY3Rpb24nKTtcbiAgICAgIHByb21pc2VDaGFpbiA9IHRoaXMuX2NoYWluT3JDYWxsKHByb21pc2VDaGFpbiwgKCkgPT5cbiAgICAgICAgdGhpcy5fYWN0aW9uSGFuZGxlcih0aGlzLnByb2Nlc3NlZEFyZ3MpLFxuICAgICAgKTtcbiAgICAgIGlmICh0aGlzLnBhcmVudCkge1xuICAgICAgICBwcm9taXNlQ2hhaW4gPSB0aGlzLl9jaGFpbk9yQ2FsbChwcm9taXNlQ2hhaW4sICgpID0+IHtcbiAgICAgICAgICB0aGlzLnBhcmVudC5lbWl0KGNvbW1hbmRFdmVudCwgb3BlcmFuZHMsIHVua25vd24pOyAvLyBsZWdhY3lcbiAgICAgICAgfSk7XG4gICAgICB9XG4gICAgICBwcm9taXNlQ2hhaW4gPSB0aGlzLl9jaGFpbk9yQ2FsbEhvb2tzKHByb21pc2VDaGFpbiwgJ3Bvc3RBY3Rpb24nKTtcbiAgICAgIHJldHVybiBwcm9taXNlQ2hhaW47XG4gICAgfVxuICAgIGlmICh0aGlzLnBhcmVudCAmJiB0aGlzLnBhcmVudC5saXN0ZW5lckNvdW50KGNvbW1hbmRFdmVudCkpIHtcbiAgICAgIGNoZWNrRm9yVW5rbm93bk9wdGlvbnMoKTtcbiAgICAgIHRoaXMuX3Byb2Nlc3NBcmd1bWVudHMoKTtcbiAgICAgIHRoaXMucGFyZW50LmVtaXQoY29tbWFuZEV2ZW50LCBvcGVyYW5kcywgdW5rbm93bik7IC8vIGxlZ2FjeVxuICAgIH0gZWxzZSBpZiAob3BlcmFuZHMubGVuZ3RoKSB7XG4gICAgICBpZiAodGhpcy5fZmluZENvbW1hbmQoJyonKSkge1xuICAgICAgICAvLyBsZWdhY3kgZGVmYXVsdCBjb21tYW5kXG4gICAgICAgIHJldHVybiB0aGlzLl9kaXNwYXRjaFN1YmNvbW1hbmQoJyonLCBvcGVyYW5kcywgdW5rbm93bik7XG4gICAgICB9XG4gICAgICBpZiAodGhpcy5saXN0ZW5lckNvdW50KCdjb21tYW5kOionKSkge1xuICAgICAgICAvLyBza2lwIG9wdGlvbiBjaGVjaywgZW1pdCBldmVudCBmb3IgcG9zc2libGUgbWlzc3BlbGxpbmcgc3VnZ2VzdGlvblxuICAgICAgICB0aGlzLmVtaXQoJ2NvbW1hbmQ6KicsIG9wZXJhbmRzLCB1bmtub3duKTtcbiAgICAgIH0gZWxzZSBpZiAodGhpcy5jb21tYW5kcy5sZW5ndGgpIHtcbiAgICAgICAgdGhpcy51bmtub3duQ29tbWFuZCgpO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgY2hlY2tGb3JVbmtub3duT3B0aW9ucygpO1xuICAgICAgICB0aGlzLl9wcm9jZXNzQXJndW1lbnRzKCk7XG4gICAgICB9XG4gICAgfSBlbHNlIGlmICh0aGlzLmNvbW1hbmRzLmxlbmd0aCkge1xuICAgICAgY2hlY2tGb3JVbmtub3duT3B0aW9ucygpO1xuICAgICAgLy8gVGhpcyBjb21tYW5kIGhhcyBzdWJjb21tYW5kcyBhbmQgbm90aGluZyBob29rZWQgdXAgYXQgdGhpcyBsZXZlbCwgc28gZGlzcGxheSBoZWxwIChhbmQgZXhpdCkuXG4gICAgICB0aGlzLmhlbHAoeyBlcnJvcjogdHJ1ZSB9KTtcbiAgICB9IGVsc2Uge1xuICAgICAgY2hlY2tGb3JVbmtub3duT3B0aW9ucygpO1xuICAgICAgdGhpcy5fcHJvY2Vzc0FyZ3VtZW50cygpO1xuICAgICAgLy8gZmFsbCB0aHJvdWdoIGZvciBjYWxsZXIgdG8gaGFuZGxlIGFmdGVyIGNhbGxpbmcgLnBhcnNlKClcbiAgICB9XG4gIH1cblxuICAvKipcbiAgICogRmluZCBtYXRjaGluZyBjb21tYW5kLlxuICAgKlxuICAgKiBAcHJpdmF0ZVxuICAgKiBAcmV0dXJuIHtDb21tYW5kIHwgdW5kZWZpbmVkfVxuICAgKi9cbiAgX2ZpbmRDb21tYW5kKG5hbWUpIHtcbiAgICBpZiAoIW5hbWUpIHJldHVybiB1bmRlZmluZWQ7XG4gICAgcmV0dXJuIHRoaXMuY29tbWFuZHMuZmluZChcbiAgICAgIChjbWQpID0+IGNtZC5fbmFtZSA9PT0gbmFtZSB8fCBjbWQuX2FsaWFzZXMuaW5jbHVkZXMobmFtZSksXG4gICAgKTtcbiAgfVxuXG4gIC8qKlxuICAgKiBSZXR1cm4gYW4gb3B0aW9uIG1hdGNoaW5nIGBhcmdgIGlmIGFueS5cbiAgICpcbiAgICogQHBhcmFtIHtzdHJpbmd9IGFyZ1xuICAgKiBAcmV0dXJuIHtPcHRpb259XG4gICAqIEBwYWNrYWdlXG4gICAqL1xuXG4gIF9maW5kT3B0aW9uKGFyZykge1xuICAgIHJldHVybiB0aGlzLm9wdGlvbnMuZmluZCgob3B0aW9uKSA9PiBvcHRpb24uaXMoYXJnKSk7XG4gIH1cblxuICAvKipcbiAgICogRGlzcGxheSBhbiBlcnJvciBtZXNzYWdlIGlmIGEgbWFuZGF0b3J5IG9wdGlvbiBkb2VzIG5vdCBoYXZlIGEgdmFsdWUuXG4gICAqIENhbGxlZCBhZnRlciBjaGVja2luZyBmb3IgaGVscCBmbGFncyBpbiBsZWFmIHN1YmNvbW1hbmQuXG4gICAqXG4gICAqIEBwcml2YXRlXG4gICAqL1xuXG4gIF9jaGVja0Zvck1pc3NpbmdNYW5kYXRvcnlPcHRpb25zKCkge1xuICAgIC8vIFdhbGsgdXAgaGllcmFyY2h5IHNvIGNhbiBjYWxsIGluIHN1YmNvbW1hbmQgYWZ0ZXIgY2hlY2tpbmcgZm9yIGRpc3BsYXlpbmcgaGVscC5cbiAgICB0aGlzLl9nZXRDb21tYW5kQW5kQW5jZXN0b3JzKCkuZm9yRWFjaCgoY21kKSA9PiB7XG4gICAgICBjbWQub3B0aW9ucy5mb3JFYWNoKChhbk9wdGlvbikgPT4ge1xuICAgICAgICBpZiAoXG4gICAgICAgICAgYW5PcHRpb24ubWFuZGF0b3J5ICYmXG4gICAgICAgICAgY21kLmdldE9wdGlvblZhbHVlKGFuT3B0aW9uLmF0dHJpYnV0ZU5hbWUoKSkgPT09IHVuZGVmaW5lZFxuICAgICAgICApIHtcbiAgICAgICAgICBjbWQubWlzc2luZ01hbmRhdG9yeU9wdGlvblZhbHVlKGFuT3B0aW9uKTtcbiAgICAgICAgfVxuICAgICAgfSk7XG4gICAgfSk7XG4gIH1cblxuICAvKipcbiAgICogRGlzcGxheSBhbiBlcnJvciBtZXNzYWdlIGlmIGNvbmZsaWN0aW5nIG9wdGlvbnMgYXJlIHVzZWQgdG9nZXRoZXIgaW4gdGhpcy5cbiAgICpcbiAgICogQHByaXZhdGVcbiAgICovXG4gIF9jaGVja0ZvckNvbmZsaWN0aW5nTG9jYWxPcHRpb25zKCkge1xuICAgIGNvbnN0IGRlZmluZWROb25EZWZhdWx0T3B0aW9ucyA9IHRoaXMub3B0aW9ucy5maWx0ZXIoKG9wdGlvbikgPT4ge1xuICAgICAgY29uc3Qgb3B0aW9uS2V5ID0gb3B0aW9uLmF0dHJpYnV0ZU5hbWUoKTtcbiAgICAgIGlmICh0aGlzLmdldE9wdGlvblZhbHVlKG9wdGlvbktleSkgPT09IHVuZGVmaW5lZCkge1xuICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICB9XG4gICAgICByZXR1cm4gdGhpcy5nZXRPcHRpb25WYWx1ZVNvdXJjZShvcHRpb25LZXkpICE9PSAnZGVmYXVsdCc7XG4gICAgfSk7XG5cbiAgICBjb25zdCBvcHRpb25zV2l0aENvbmZsaWN0aW5nID0gZGVmaW5lZE5vbkRlZmF1bHRPcHRpb25zLmZpbHRlcihcbiAgICAgIChvcHRpb24pID0+IG9wdGlvbi5jb25mbGljdHNXaXRoLmxlbmd0aCA+IDAsXG4gICAgKTtcblxuICAgIG9wdGlvbnNXaXRoQ29uZmxpY3RpbmcuZm9yRWFjaCgob3B0aW9uKSA9PiB7XG4gICAgICBjb25zdCBjb25mbGljdGluZ0FuZERlZmluZWQgPSBkZWZpbmVkTm9uRGVmYXVsdE9wdGlvbnMuZmluZCgoZGVmaW5lZCkgPT5cbiAgICAgICAgb3B0aW9uLmNvbmZsaWN0c1dpdGguaW5jbHVkZXMoZGVmaW5lZC5hdHRyaWJ1dGVOYW1lKCkpLFxuICAgICAgKTtcbiAgICAgIGlmIChjb25mbGljdGluZ0FuZERlZmluZWQpIHtcbiAgICAgICAgdGhpcy5fY29uZmxpY3RpbmdPcHRpb24ob3B0aW9uLCBjb25mbGljdGluZ0FuZERlZmluZWQpO1xuICAgICAgfVxuICAgIH0pO1xuICB9XG5cbiAgLyoqXG4gICAqIERpc3BsYXkgYW4gZXJyb3IgbWVzc2FnZSBpZiBjb25mbGljdGluZyBvcHRpb25zIGFyZSB1c2VkIHRvZ2V0aGVyLlxuICAgKiBDYWxsZWQgYWZ0ZXIgY2hlY2tpbmcgZm9yIGhlbHAgZmxhZ3MgaW4gbGVhZiBzdWJjb21tYW5kLlxuICAgKlxuICAgKiBAcHJpdmF0ZVxuICAgKi9cbiAgX2NoZWNrRm9yQ29uZmxpY3RpbmdPcHRpb25zKCkge1xuICAgIC8vIFdhbGsgdXAgaGllcmFyY2h5IHNvIGNhbiBjYWxsIGluIHN1YmNvbW1hbmQgYWZ0ZXIgY2hlY2tpbmcgZm9yIGRpc3BsYXlpbmcgaGVscC5cbiAgICB0aGlzLl9nZXRDb21tYW5kQW5kQW5jZXN0b3JzKCkuZm9yRWFjaCgoY21kKSA9PiB7XG4gICAgICBjbWQuX2NoZWNrRm9yQ29uZmxpY3RpbmdMb2NhbE9wdGlvbnMoKTtcbiAgICB9KTtcbiAgfVxuXG4gIC8qKlxuICAgKiBQYXJzZSBvcHRpb25zIGZyb20gYGFyZ3ZgIHJlbW92aW5nIGtub3duIG9wdGlvbnMsXG4gICAqIGFuZCByZXR1cm4gYXJndiBzcGxpdCBpbnRvIG9wZXJhbmRzIGFuZCB1bmtub3duIGFyZ3VtZW50cy5cbiAgICpcbiAgICogRXhhbXBsZXM6XG4gICAqXG4gICAqICAgICBhcmd2ID0+IG9wZXJhbmRzLCB1bmtub3duXG4gICAqICAgICAtLWtub3duIGtrayBvcCA9PiBbb3BdLCBbXVxuICAgKiAgICAgb3AgLS1rbm93biBra2sgPT4gW29wXSwgW11cbiAgICogICAgIHN1YiAtLXVua25vd24gdXV1IG9wID0+IFtzdWJdLCBbLS11bmtub3duIHV1dSBvcF1cbiAgICogICAgIHN1YiAtLSAtLXVua25vd24gdXV1IG9wID0+IFtzdWIgLS11bmtub3duIHV1dSBvcF0sIFtdXG4gICAqXG4gICAqIEBwYXJhbSB7c3RyaW5nW119IGFyZ3ZcbiAgICogQHJldHVybiB7e29wZXJhbmRzOiBzdHJpbmdbXSwgdW5rbm93bjogc3RyaW5nW119fVxuICAgKi9cblxuICBwYXJzZU9wdGlvbnMoYXJndikge1xuICAgIGNvbnN0IG9wZXJhbmRzID0gW107IC8vIG9wZXJhbmRzLCBub3Qgb3B0aW9ucyBvciB2YWx1ZXNcbiAgICBjb25zdCB1bmtub3duID0gW107IC8vIGZpcnN0IHVua25vd24gb3B0aW9uIGFuZCByZW1haW5pbmcgdW5rbm93biBhcmdzXG4gICAgbGV0IGRlc3QgPSBvcGVyYW5kcztcbiAgICBjb25zdCBhcmdzID0gYXJndi5zbGljZSgpO1xuXG4gICAgZnVuY3Rpb24gbWF5YmVPcHRpb24oYXJnKSB7XG4gICAgICByZXR1cm4gYXJnLmxlbmd0aCA+IDEgJiYgYXJnWzBdID09PSAnLSc7XG4gICAgfVxuXG4gICAgLy8gcGFyc2Ugb3B0aW9uc1xuICAgIGxldCBhY3RpdmVWYXJpYWRpY09wdGlvbiA9IG51bGw7XG4gICAgd2hpbGUgKGFyZ3MubGVuZ3RoKSB7XG4gICAgICBjb25zdCBhcmcgPSBhcmdzLnNoaWZ0KCk7XG5cbiAgICAgIC8vIGxpdGVyYWxcbiAgICAgIGlmIChhcmcgPT09ICctLScpIHtcbiAgICAgICAgaWYgKGRlc3QgPT09IHVua25vd24pIGRlc3QucHVzaChhcmcpO1xuICAgICAgICBkZXN0LnB1c2goLi4uYXJncyk7XG4gICAgICAgIGJyZWFrO1xuICAgICAgfVxuXG4gICAgICBpZiAoYWN0aXZlVmFyaWFkaWNPcHRpb24gJiYgIW1heWJlT3B0aW9uKGFyZykpIHtcbiAgICAgICAgdGhpcy5lbWl0KGBvcHRpb246JHthY3RpdmVWYXJpYWRpY09wdGlvbi5uYW1lKCl9YCwgYXJnKTtcbiAgICAgICAgY29udGludWU7XG4gICAgICB9XG4gICAgICBhY3RpdmVWYXJpYWRpY09wdGlvbiA9IG51bGw7XG5cbiAgICAgIGlmIChtYXliZU9wdGlvbihhcmcpKSB7XG4gICAgICAgIGNvbnN0IG9wdGlvbiA9IHRoaXMuX2ZpbmRPcHRpb24oYXJnKTtcbiAgICAgICAgLy8gcmVjb2duaXNlZCBvcHRpb24sIGNhbGwgbGlzdGVuZXIgdG8gYXNzaWduIHZhbHVlIHdpdGggcG9zc2libGUgY3VzdG9tIHByb2Nlc3NpbmdcbiAgICAgICAgaWYgKG9wdGlvbikge1xuICAgICAgICAgIGlmIChvcHRpb24ucmVxdWlyZWQpIHtcbiAgICAgICAgICAgIGNvbnN0IHZhbHVlID0gYXJncy5zaGlmdCgpO1xuICAgICAgICAgICAgaWYgKHZhbHVlID09PSB1bmRlZmluZWQpIHRoaXMub3B0aW9uTWlzc2luZ0FyZ3VtZW50KG9wdGlvbik7XG4gICAgICAgICAgICB0aGlzLmVtaXQoYG9wdGlvbjoke29wdGlvbi5uYW1lKCl9YCwgdmFsdWUpO1xuICAgICAgICAgIH0gZWxzZSBpZiAob3B0aW9uLm9wdGlvbmFsKSB7XG4gICAgICAgICAgICBsZXQgdmFsdWUgPSBudWxsO1xuICAgICAgICAgICAgLy8gaGlzdG9yaWNhbCBiZWhhdmlvdXIgaXMgb3B0aW9uYWwgdmFsdWUgaXMgZm9sbG93aW5nIGFyZyB1bmxlc3MgYW4gb3B0aW9uXG4gICAgICAgICAgICBpZiAoYXJncy5sZW5ndGggPiAwICYmICFtYXliZU9wdGlvbihhcmdzWzBdKSkge1xuICAgICAgICAgICAgICB2YWx1ZSA9IGFyZ3Muc2hpZnQoKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHRoaXMuZW1pdChgb3B0aW9uOiR7b3B0aW9uLm5hbWUoKX1gLCB2YWx1ZSk7XG4gICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIC8vIGJvb2xlYW4gZmxhZ1xuICAgICAgICAgICAgdGhpcy5lbWl0KGBvcHRpb246JHtvcHRpb24ubmFtZSgpfWApO1xuICAgICAgICAgIH1cbiAgICAgICAgICBhY3RpdmVWYXJpYWRpY09wdGlvbiA9IG9wdGlvbi52YXJpYWRpYyA/IG9wdGlvbiA6IG51bGw7XG4gICAgICAgICAgY29udGludWU7XG4gICAgICAgIH1cbiAgICAgIH1cblxuICAgICAgLy8gTG9vayBmb3IgY29tYm8gb3B0aW9ucyBmb2xsb3dpbmcgc2luZ2xlIGRhc2gsIGVhdCBmaXJzdCBvbmUgaWYga25vd24uXG4gICAgICBpZiAoYXJnLmxlbmd0aCA+IDIgJiYgYXJnWzBdID09PSAnLScgJiYgYXJnWzFdICE9PSAnLScpIHtcbiAgICAgICAgY29uc3Qgb3B0aW9uID0gdGhpcy5fZmluZE9wdGlvbihgLSR7YXJnWzFdfWApO1xuICAgICAgICBpZiAob3B0aW9uKSB7XG4gICAgICAgICAgaWYgKFxuICAgICAgICAgICAgb3B0aW9uLnJlcXVpcmVkIHx8XG4gICAgICAgICAgICAob3B0aW9uLm9wdGlvbmFsICYmIHRoaXMuX2NvbWJpbmVGbGFnQW5kT3B0aW9uYWxWYWx1ZSlcbiAgICAgICAgICApIHtcbiAgICAgICAgICAgIC8vIG9wdGlvbiB3aXRoIHZhbHVlIGZvbGxvd2luZyBpbiBzYW1lIGFyZ3VtZW50XG4gICAgICAgICAgICB0aGlzLmVtaXQoYG9wdGlvbjoke29wdGlvbi5uYW1lKCl9YCwgYXJnLnNsaWNlKDIpKTtcbiAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgLy8gYm9vbGVhbiBvcHRpb24sIGVtaXQgYW5kIHB1dCBiYWNrIHJlbWFpbmRlciBvZiBhcmcgZm9yIGZ1cnRoZXIgcHJvY2Vzc2luZ1xuICAgICAgICAgICAgdGhpcy5lbWl0KGBvcHRpb246JHtvcHRpb24ubmFtZSgpfWApO1xuICAgICAgICAgICAgYXJncy51bnNoaWZ0KGAtJHthcmcuc2xpY2UoMil9YCk7XG4gICAgICAgICAgfVxuICAgICAgICAgIGNvbnRpbnVlO1xuICAgICAgICB9XG4gICAgICB9XG5cbiAgICAgIC8vIExvb2sgZm9yIGtub3duIGxvbmcgZmxhZyB3aXRoIHZhbHVlLCBsaWtlIC0tZm9vPWJhclxuICAgICAgaWYgKC9eLS1bXj1dKz0vLnRlc3QoYXJnKSkge1xuICAgICAgICBjb25zdCBpbmRleCA9IGFyZy5pbmRleE9mKCc9Jyk7XG4gICAgICAgIGNvbnN0IG9wdGlvbiA9IHRoaXMuX2ZpbmRPcHRpb24oYXJnLnNsaWNlKDAsIGluZGV4KSk7XG4gICAgICAgIGlmIChvcHRpb24gJiYgKG9wdGlvbi5yZXF1aXJlZCB8fCBvcHRpb24ub3B0aW9uYWwpKSB7XG4gICAgICAgICAgdGhpcy5lbWl0KGBvcHRpb246JHtvcHRpb24ubmFtZSgpfWAsIGFyZy5zbGljZShpbmRleCArIDEpKTtcbiAgICAgICAgICBjb250aW51ZTtcbiAgICAgICAgfVxuICAgICAgfVxuXG4gICAgICAvLyBOb3QgYSByZWNvZ25pc2VkIG9wdGlvbiBieSB0aGlzIGNvbW1hbmQuXG4gICAgICAvLyBNaWdodCBiZSBhIGNvbW1hbmQtYXJndW1lbnQsIG9yIHN1YmNvbW1hbmQgb3B0aW9uLCBvciB1bmtub3duIG9wdGlvbiwgb3IgaGVscCBjb21tYW5kIG9yIG9wdGlvbi5cblxuICAgICAgLy8gQW4gdW5rbm93biBvcHRpb24gbWVhbnMgZnVydGhlciBhcmd1bWVudHMgYWxzbyBjbGFzc2lmaWVkIGFzIHVua25vd24gc28gY2FuIGJlIHJlcHJvY2Vzc2VkIGJ5IHN1YmNvbW1hbmRzLlxuICAgICAgaWYgKG1heWJlT3B0aW9uKGFyZykpIHtcbiAgICAgICAgZGVzdCA9IHVua25vd247XG4gICAgICB9XG5cbiAgICAgIC8vIElmIHVzaW5nIHBvc2l0aW9uYWxPcHRpb25zLCBzdG9wIHByb2Nlc3Npbmcgb3VyIG9wdGlvbnMgYXQgc3ViY29tbWFuZC5cbiAgICAgIGlmIChcbiAgICAgICAgKHRoaXMuX2VuYWJsZVBvc2l0aW9uYWxPcHRpb25zIHx8IHRoaXMuX3Bhc3NUaHJvdWdoT3B0aW9ucykgJiZcbiAgICAgICAgb3BlcmFuZHMubGVuZ3RoID09PSAwICYmXG4gICAgICAgIHVua25vd24ubGVuZ3RoID09PSAwXG4gICAgICApIHtcbiAgICAgICAgaWYgKHRoaXMuX2ZpbmRDb21tYW5kKGFyZykpIHtcbiAgICAgICAgICBvcGVyYW5kcy5wdXNoKGFyZyk7XG4gICAgICAgICAgaWYgKGFyZ3MubGVuZ3RoID4gMCkgdW5rbm93bi5wdXNoKC4uLmFyZ3MpO1xuICAgICAgICAgIGJyZWFrO1xuICAgICAgICB9IGVsc2UgaWYgKFxuICAgICAgICAgIHRoaXMuX2dldEhlbHBDb21tYW5kKCkgJiZcbiAgICAgICAgICBhcmcgPT09IHRoaXMuX2dldEhlbHBDb21tYW5kKCkubmFtZSgpXG4gICAgICAgICkge1xuICAgICAgICAgIG9wZXJhbmRzLnB1c2goYXJnKTtcbiAgICAgICAgICBpZiAoYXJncy5sZW5ndGggPiAwKSBvcGVyYW5kcy5wdXNoKC4uLmFyZ3MpO1xuICAgICAgICAgIGJyZWFrO1xuICAgICAgICB9IGVsc2UgaWYgKHRoaXMuX2RlZmF1bHRDb21tYW5kTmFtZSkge1xuICAgICAgICAgIHVua25vd24ucHVzaChhcmcpO1xuICAgICAgICAgIGlmIChhcmdzLmxlbmd0aCA+IDApIHVua25vd24ucHVzaCguLi5hcmdzKTtcbiAgICAgICAgICBicmVhaztcbiAgICAgICAgfVxuICAgICAgfVxuXG4gICAgICAvLyBJZiB1c2luZyBwYXNzVGhyb3VnaE9wdGlvbnMsIHN0b3AgcHJvY2Vzc2luZyBvcHRpb25zIGF0IGZpcnN0IGNvbW1hbmQtYXJndW1lbnQuXG4gICAgICBpZiAodGhpcy5fcGFzc1Rocm91Z2hPcHRpb25zKSB7XG4gICAgICAgIGRlc3QucHVzaChhcmcpO1xuICAgICAgICBpZiAoYXJncy5sZW5ndGggPiAwKSBkZXN0LnB1c2goLi4uYXJncyk7XG4gICAgICAgIGJyZWFrO1xuICAgICAgfVxuXG4gICAgICAvLyBhZGQgYXJnXG4gICAgICBkZXN0LnB1c2goYXJnKTtcbiAgICB9XG5cbiAgICByZXR1cm4geyBvcGVyYW5kcywgdW5rbm93biB9O1xuICB9XG5cbiAgLyoqXG4gICAqIFJldHVybiBhbiBvYmplY3QgY29udGFpbmluZyBsb2NhbCBvcHRpb24gdmFsdWVzIGFzIGtleS12YWx1ZSBwYWlycy5cbiAgICpcbiAgICogQHJldHVybiB7b2JqZWN0fVxuICAgKi9cbiAgb3B0cygpIHtcbiAgICBpZiAodGhpcy5fc3RvcmVPcHRpb25zQXNQcm9wZXJ0aWVzKSB7XG4gICAgICAvLyBQcmVzZXJ2ZSBvcmlnaW5hbCBiZWhhdmlvdXIgc28gYmFja3dhcmRzIGNvbXBhdGlibGUgd2hlbiBzdGlsbCB1c2luZyBwcm9wZXJ0aWVzXG4gICAgICBjb25zdCByZXN1bHQgPSB7fTtcbiAgICAgIGNvbnN0IGxlbiA9IHRoaXMub3B0aW9ucy5sZW5ndGg7XG5cbiAgICAgIGZvciAobGV0IGkgPSAwOyBpIDwgbGVuOyBpKyspIHtcbiAgICAgICAgY29uc3Qga2V5ID0gdGhpcy5vcHRpb25zW2ldLmF0dHJpYnV0ZU5hbWUoKTtcbiAgICAgICAgcmVzdWx0W2tleV0gPVxuICAgICAgICAgIGtleSA9PT0gdGhpcy5fdmVyc2lvbk9wdGlvbk5hbWUgPyB0aGlzLl92ZXJzaW9uIDogdGhpc1trZXldO1xuICAgICAgfVxuICAgICAgcmV0dXJuIHJlc3VsdDtcbiAgICB9XG5cbiAgICByZXR1cm4gdGhpcy5fb3B0aW9uVmFsdWVzO1xuICB9XG5cbiAgLyoqXG4gICAqIFJldHVybiBhbiBvYmplY3QgY29udGFpbmluZyBtZXJnZWQgbG9jYWwgYW5kIGdsb2JhbCBvcHRpb24gdmFsdWVzIGFzIGtleS12YWx1ZSBwYWlycy5cbiAgICpcbiAgICogQHJldHVybiB7b2JqZWN0fVxuICAgKi9cbiAgb3B0c1dpdGhHbG9iYWxzKCkge1xuICAgIC8vIGdsb2JhbHMgb3ZlcndyaXRlIGxvY2Fsc1xuICAgIHJldHVybiB0aGlzLl9nZXRDb21tYW5kQW5kQW5jZXN0b3JzKCkucmVkdWNlKFxuICAgICAgKGNvbWJpbmVkT3B0aW9ucywgY21kKSA9PiBPYmplY3QuYXNzaWduKGNvbWJpbmVkT3B0aW9ucywgY21kLm9wdHMoKSksXG4gICAgICB7fSxcbiAgICApO1xuICB9XG5cbiAgLyoqXG4gICAqIERpc3BsYXkgZXJyb3IgbWVzc2FnZSBhbmQgZXhpdCAob3IgY2FsbCBleGl0T3ZlcnJpZGUpLlxuICAgKlxuICAgKiBAcGFyYW0ge3N0cmluZ30gbWVzc2FnZVxuICAgKiBAcGFyYW0ge29iamVjdH0gW2Vycm9yT3B0aW9uc11cbiAgICogQHBhcmFtIHtzdHJpbmd9IFtlcnJvck9wdGlvbnMuY29kZV0gLSBhbiBpZCBzdHJpbmcgcmVwcmVzZW50aW5nIHRoZSBlcnJvclxuICAgKiBAcGFyYW0ge251bWJlcn0gW2Vycm9yT3B0aW9ucy5leGl0Q29kZV0gLSB1c2VkIHdpdGggcHJvY2Vzcy5leGl0XG4gICAqL1xuICBlcnJvcihtZXNzYWdlLCBlcnJvck9wdGlvbnMpIHtcbiAgICAvLyBvdXRwdXQgaGFuZGxpbmdcbiAgICB0aGlzLl9vdXRwdXRDb25maWd1cmF0aW9uLm91dHB1dEVycm9yKFxuICAgICAgYCR7bWVzc2FnZX1cXG5gLFxuICAgICAgdGhpcy5fb3V0cHV0Q29uZmlndXJhdGlvbi53cml0ZUVycixcbiAgICApO1xuICAgIGlmICh0eXBlb2YgdGhpcy5fc2hvd0hlbHBBZnRlckVycm9yID09PSAnc3RyaW5nJykge1xuICAgICAgdGhpcy5fb3V0cHV0Q29uZmlndXJhdGlvbi53cml0ZUVycihgJHt0aGlzLl9zaG93SGVscEFmdGVyRXJyb3J9XFxuYCk7XG4gICAgfSBlbHNlIGlmICh0aGlzLl9zaG93SGVscEFmdGVyRXJyb3IpIHtcbiAgICAgIHRoaXMuX291dHB1dENvbmZpZ3VyYXRpb24ud3JpdGVFcnIoJ1xcbicpO1xuICAgICAgdGhpcy5vdXRwdXRIZWxwKHsgZXJyb3I6IHRydWUgfSk7XG4gICAgfVxuXG4gICAgLy8gZXhpdCBoYW5kbGluZ1xuICAgIGNvbnN0IGNvbmZpZyA9IGVycm9yT3B0aW9ucyB8fCB7fTtcbiAgICBjb25zdCBleGl0Q29kZSA9IGNvbmZpZy5leGl0Q29kZSB8fCAxO1xuICAgIGNvbnN0IGNvZGUgPSBjb25maWcuY29kZSB8fCAnY29tbWFuZGVyLmVycm9yJztcbiAgICB0aGlzLl9leGl0KGV4aXRDb2RlLCBjb2RlLCBtZXNzYWdlKTtcbiAgfVxuXG4gIC8qKlxuICAgKiBBcHBseSBhbnkgb3B0aW9uIHJlbGF0ZWQgZW52aXJvbm1lbnQgdmFyaWFibGVzLCBpZiBvcHRpb24gZG9lc1xuICAgKiBub3QgaGF2ZSBhIHZhbHVlIGZyb20gY2xpIG9yIGNsaWVudCBjb2RlLlxuICAgKlxuICAgKiBAcHJpdmF0ZVxuICAgKi9cbiAgX3BhcnNlT3B0aW9uc0VudigpIHtcbiAgICB0aGlzLm9wdGlvbnMuZm9yRWFjaCgob3B0aW9uKSA9PiB7XG4gICAgICBpZiAob3B0aW9uLmVudlZhciAmJiBvcHRpb24uZW52VmFyIGluIHByb2Nlc3MuZW52KSB7XG4gICAgICAgIGNvbnN0IG9wdGlvbktleSA9IG9wdGlvbi5hdHRyaWJ1dGVOYW1lKCk7XG4gICAgICAgIC8vIFByaW9yaXR5IGNoZWNrLiBEbyBub3Qgb3ZlcndyaXRlIGNsaSBvciBvcHRpb25zIGZyb20gdW5rbm93biBzb3VyY2UgKGNsaWVudC1jb2RlKS5cbiAgICAgICAgaWYgKFxuICAgICAgICAgIHRoaXMuZ2V0T3B0aW9uVmFsdWUob3B0aW9uS2V5KSA9PT0gdW5kZWZpbmVkIHx8XG4gICAgICAgICAgWydkZWZhdWx0JywgJ2NvbmZpZycsICdlbnYnXS5pbmNsdWRlcyhcbiAgICAgICAgICAgIHRoaXMuZ2V0T3B0aW9uVmFsdWVTb3VyY2Uob3B0aW9uS2V5KSxcbiAgICAgICAgICApXG4gICAgICAgICkge1xuICAgICAgICAgIGlmIChvcHRpb24ucmVxdWlyZWQgfHwgb3B0aW9uLm9wdGlvbmFsKSB7XG4gICAgICAgICAgICAvLyBvcHRpb24gY2FuIHRha2UgYSB2YWx1ZVxuICAgICAgICAgICAgLy8ga2VlcCB2ZXJ5IHNpbXBsZSwgb3B0aW9uYWwgYWx3YXlzIHRha2VzIHZhbHVlXG4gICAgICAgICAgICB0aGlzLmVtaXQoYG9wdGlvbkVudjoke29wdGlvbi5uYW1lKCl9YCwgcHJvY2Vzcy5lbnZbb3B0aW9uLmVudlZhcl0pO1xuICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAvLyBib29sZWFuXG4gICAgICAgICAgICAvLyBrZWVwIHZlcnkgc2ltcGxlLCBvbmx5IGNhcmUgdGhhdCBlbnZWYXIgZGVmaW5lZCBhbmQgbm90IHRoZSB2YWx1ZVxuICAgICAgICAgICAgdGhpcy5lbWl0KGBvcHRpb25FbnY6JHtvcHRpb24ubmFtZSgpfWApO1xuICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgfVxuICAgIH0pO1xuICB9XG5cbiAgLyoqXG4gICAqIEFwcGx5IGFueSBpbXBsaWVkIG9wdGlvbiB2YWx1ZXMsIGlmIG9wdGlvbiBpcyB1bmRlZmluZWQgb3IgZGVmYXVsdCB2YWx1ZS5cbiAgICpcbiAgICogQHByaXZhdGVcbiAgICovXG4gIF9wYXJzZU9wdGlvbnNJbXBsaWVkKCkge1xuICAgIGNvbnN0IGR1YWxIZWxwZXIgPSBuZXcgRHVhbE9wdGlvbnModGhpcy5vcHRpb25zKTtcbiAgICBjb25zdCBoYXNDdXN0b21PcHRpb25WYWx1ZSA9IChvcHRpb25LZXkpID0+IHtcbiAgICAgIHJldHVybiAoXG4gICAgICAgIHRoaXMuZ2V0T3B0aW9uVmFsdWUob3B0aW9uS2V5KSAhPT0gdW5kZWZpbmVkICYmXG4gICAgICAgICFbJ2RlZmF1bHQnLCAnaW1wbGllZCddLmluY2x1ZGVzKHRoaXMuZ2V0T3B0aW9uVmFsdWVTb3VyY2Uob3B0aW9uS2V5KSlcbiAgICAgICk7XG4gICAgfTtcbiAgICB0aGlzLm9wdGlvbnNcbiAgICAgIC5maWx0ZXIoXG4gICAgICAgIChvcHRpb24pID0+XG4gICAgICAgICAgb3B0aW9uLmltcGxpZWQgIT09IHVuZGVmaW5lZCAmJlxuICAgICAgICAgIGhhc0N1c3RvbU9wdGlvblZhbHVlKG9wdGlvbi5hdHRyaWJ1dGVOYW1lKCkpICYmXG4gICAgICAgICAgZHVhbEhlbHBlci52YWx1ZUZyb21PcHRpb24oXG4gICAgICAgICAgICB0aGlzLmdldE9wdGlvblZhbHVlKG9wdGlvbi5hdHRyaWJ1dGVOYW1lKCkpLFxuICAgICAgICAgICAgb3B0aW9uLFxuICAgICAgICAgICksXG4gICAgICApXG4gICAgICAuZm9yRWFjaCgob3B0aW9uKSA9PiB7XG4gICAgICAgIE9iamVjdC5rZXlzKG9wdGlvbi5pbXBsaWVkKVxuICAgICAgICAgIC5maWx0ZXIoKGltcGxpZWRLZXkpID0+ICFoYXNDdXN0b21PcHRpb25WYWx1ZShpbXBsaWVkS2V5KSlcbiAgICAgICAgICAuZm9yRWFjaCgoaW1wbGllZEtleSkgPT4ge1xuICAgICAgICAgICAgdGhpcy5zZXRPcHRpb25WYWx1ZVdpdGhTb3VyY2UoXG4gICAgICAgICAgICAgIGltcGxpZWRLZXksXG4gICAgICAgICAgICAgIG9wdGlvbi5pbXBsaWVkW2ltcGxpZWRLZXldLFxuICAgICAgICAgICAgICAnaW1wbGllZCcsXG4gICAgICAgICAgICApO1xuICAgICAgICAgIH0pO1xuICAgICAgfSk7XG4gIH1cblxuICAvKipcbiAgICogQXJndW1lbnQgYG5hbWVgIGlzIG1pc3NpbmcuXG4gICAqXG4gICAqIEBwYXJhbSB7c3RyaW5nfSBuYW1lXG4gICAqIEBwcml2YXRlXG4gICAqL1xuXG4gIG1pc3NpbmdBcmd1bWVudChuYW1lKSB7XG4gICAgY29uc3QgbWVzc2FnZSA9IGBlcnJvcjogbWlzc2luZyByZXF1aXJlZCBhcmd1bWVudCAnJHtuYW1lfSdgO1xuICAgIHRoaXMuZXJyb3IobWVzc2FnZSwgeyBjb2RlOiAnY29tbWFuZGVyLm1pc3NpbmdBcmd1bWVudCcgfSk7XG4gIH1cblxuICAvKipcbiAgICogYE9wdGlvbmAgaXMgbWlzc2luZyBhbiBhcmd1bWVudC5cbiAgICpcbiAgICogQHBhcmFtIHtPcHRpb259IG9wdGlvblxuICAgKiBAcHJpdmF0ZVxuICAgKi9cblxuICBvcHRpb25NaXNzaW5nQXJndW1lbnQob3B0aW9uKSB7XG4gICAgY29uc3QgbWVzc2FnZSA9IGBlcnJvcjogb3B0aW9uICcke29wdGlvbi5mbGFnc30nIGFyZ3VtZW50IG1pc3NpbmdgO1xuICAgIHRoaXMuZXJyb3IobWVzc2FnZSwgeyBjb2RlOiAnY29tbWFuZGVyLm9wdGlvbk1pc3NpbmdBcmd1bWVudCcgfSk7XG4gIH1cblxuICAvKipcbiAgICogYE9wdGlvbmAgZG9lcyBub3QgaGF2ZSBhIHZhbHVlLCBhbmQgaXMgYSBtYW5kYXRvcnkgb3B0aW9uLlxuICAgKlxuICAgKiBAcGFyYW0ge09wdGlvbn0gb3B0aW9uXG4gICAqIEBwcml2YXRlXG4gICAqL1xuXG4gIG1pc3NpbmdNYW5kYXRvcnlPcHRpb25WYWx1ZShvcHRpb24pIHtcbiAgICBjb25zdCBtZXNzYWdlID0gYGVycm9yOiByZXF1aXJlZCBvcHRpb24gJyR7b3B0aW9uLmZsYWdzfScgbm90IHNwZWNpZmllZGA7XG4gICAgdGhpcy5lcnJvcihtZXNzYWdlLCB7IGNvZGU6ICdjb21tYW5kZXIubWlzc2luZ01hbmRhdG9yeU9wdGlvblZhbHVlJyB9KTtcbiAgfVxuXG4gIC8qKlxuICAgKiBgT3B0aW9uYCBjb25mbGljdHMgd2l0aCBhbm90aGVyIG9wdGlvbi5cbiAgICpcbiAgICogQHBhcmFtIHtPcHRpb259IG9wdGlvblxuICAgKiBAcGFyYW0ge09wdGlvbn0gY29uZmxpY3RpbmdPcHRpb25cbiAgICogQHByaXZhdGVcbiAgICovXG4gIF9jb25mbGljdGluZ09wdGlvbihvcHRpb24sIGNvbmZsaWN0aW5nT3B0aW9uKSB7XG4gICAgLy8gVGhlIGNhbGxpbmcgY29kZSBkb2VzIG5vdCBrbm93IHdoZXRoZXIgYSBuZWdhdGVkIG9wdGlvbiBpcyB0aGUgc291cmNlIG9mIHRoZVxuICAgIC8vIHZhbHVlLCBzbyBkbyBzb21lIHdvcmsgdG8gdGFrZSBhbiBlZHVjYXRlZCBndWVzcy5cbiAgICBjb25zdCBmaW5kQmVzdE9wdGlvbkZyb21WYWx1ZSA9IChvcHRpb24pID0+IHtcbiAgICAgIGNvbnN0IG9wdGlvbktleSA9IG9wdGlvbi5hdHRyaWJ1dGVOYW1lKCk7XG4gICAgICBjb25zdCBvcHRpb25WYWx1ZSA9IHRoaXMuZ2V0T3B0aW9uVmFsdWUob3B0aW9uS2V5KTtcbiAgICAgIGNvbnN0IG5lZ2F0aXZlT3B0aW9uID0gdGhpcy5vcHRpb25zLmZpbmQoXG4gICAgICAgICh0YXJnZXQpID0+IHRhcmdldC5uZWdhdGUgJiYgb3B0aW9uS2V5ID09PSB0YXJnZXQuYXR0cmlidXRlTmFtZSgpLFxuICAgICAgKTtcbiAgICAgIGNvbnN0IHBvc2l0aXZlT3B0aW9uID0gdGhpcy5vcHRpb25zLmZpbmQoXG4gICAgICAgICh0YXJnZXQpID0+ICF0YXJnZXQubmVnYXRlICYmIG9wdGlvbktleSA9PT0gdGFyZ2V0LmF0dHJpYnV0ZU5hbWUoKSxcbiAgICAgICk7XG4gICAgICBpZiAoXG4gICAgICAgIG5lZ2F0aXZlT3B0aW9uICYmXG4gICAgICAgICgobmVnYXRpdmVPcHRpb24ucHJlc2V0QXJnID09PSB1bmRlZmluZWQgJiYgb3B0aW9uVmFsdWUgPT09IGZhbHNlKSB8fFxuICAgICAgICAgIChuZWdhdGl2ZU9wdGlvbi5wcmVzZXRBcmcgIT09IHVuZGVmaW5lZCAmJlxuICAgICAgICAgICAgb3B0aW9uVmFsdWUgPT09IG5lZ2F0aXZlT3B0aW9uLnByZXNldEFyZykpXG4gICAgICApIHtcbiAgICAgICAgcmV0dXJuIG5lZ2F0aXZlT3B0aW9uO1xuICAgICAgfVxuICAgICAgcmV0dXJuIHBvc2l0aXZlT3B0aW9uIHx8IG9wdGlvbjtcbiAgICB9O1xuXG4gICAgY29uc3QgZ2V0RXJyb3JNZXNzYWdlID0gKG9wdGlvbikgPT4ge1xuICAgICAgY29uc3QgYmVzdE9wdGlvbiA9IGZpbmRCZXN0T3B0aW9uRnJvbVZhbHVlKG9wdGlvbik7XG4gICAgICBjb25zdCBvcHRpb25LZXkgPSBiZXN0T3B0aW9uLmF0dHJpYnV0ZU5hbWUoKTtcbiAgICAgIGNvbnN0IHNvdXJjZSA9IHRoaXMuZ2V0T3B0aW9uVmFsdWVTb3VyY2Uob3B0aW9uS2V5KTtcbiAgICAgIGlmIChzb3VyY2UgPT09ICdlbnYnKSB7XG4gICAgICAgIHJldHVybiBgZW52aXJvbm1lbnQgdmFyaWFibGUgJyR7YmVzdE9wdGlvbi5lbnZWYXJ9J2A7XG4gICAgICB9XG4gICAgICByZXR1cm4gYG9wdGlvbiAnJHtiZXN0T3B0aW9uLmZsYWdzfSdgO1xuICAgIH07XG5cbiAgICBjb25zdCBtZXNzYWdlID0gYGVycm9yOiAke2dldEVycm9yTWVzc2FnZShvcHRpb24pfSBjYW5ub3QgYmUgdXNlZCB3aXRoICR7Z2V0RXJyb3JNZXNzYWdlKGNvbmZsaWN0aW5nT3B0aW9uKX1gO1xuICAgIHRoaXMuZXJyb3IobWVzc2FnZSwgeyBjb2RlOiAnY29tbWFuZGVyLmNvbmZsaWN0aW5nT3B0aW9uJyB9KTtcbiAgfVxuXG4gIC8qKlxuICAgKiBVbmtub3duIG9wdGlvbiBgZmxhZ2AuXG4gICAqXG4gICAqIEBwYXJhbSB7c3RyaW5nfSBmbGFnXG4gICAqIEBwcml2YXRlXG4gICAqL1xuXG4gIHVua25vd25PcHRpb24oZmxhZykge1xuICAgIGlmICh0aGlzLl9hbGxvd1Vua25vd25PcHRpb24pIHJldHVybjtcbiAgICBsZXQgc3VnZ2VzdGlvbiA9ICcnO1xuXG4gICAgaWYgKGZsYWcuc3RhcnRzV2l0aCgnLS0nKSAmJiB0aGlzLl9zaG93U3VnZ2VzdGlvbkFmdGVyRXJyb3IpIHtcbiAgICAgIC8vIExvb3BpbmcgdG8gcGljayB1cCB0aGUgZ2xvYmFsIG9wdGlvbnMgdG9vXG4gICAgICBsZXQgY2FuZGlkYXRlRmxhZ3MgPSBbXTtcbiAgICAgIC8vIGVzbGludC1kaXNhYmxlLW5leHQtbGluZSBAdHlwZXNjcmlwdC1lc2xpbnQvbm8tdGhpcy1hbGlhc1xuICAgICAgbGV0IGNvbW1hbmQgPSB0aGlzO1xuICAgICAgZG8ge1xuICAgICAgICBjb25zdCBtb3JlRmxhZ3MgPSBjb21tYW5kXG4gICAgICAgICAgLmNyZWF0ZUhlbHAoKVxuICAgICAgICAgIC52aXNpYmxlT3B0aW9ucyhjb21tYW5kKVxuICAgICAgICAgIC5maWx0ZXIoKG9wdGlvbikgPT4gb3B0aW9uLmxvbmcpXG4gICAgICAgICAgLm1hcCgob3B0aW9uKSA9PiBvcHRpb24ubG9uZyk7XG4gICAgICAgIGNhbmRpZGF0ZUZsYWdzID0gY2FuZGlkYXRlRmxhZ3MuY29uY2F0KG1vcmVGbGFncyk7XG4gICAgICAgIGNvbW1hbmQgPSBjb21tYW5kLnBhcmVudDtcbiAgICAgIH0gd2hpbGUgKGNvbW1hbmQgJiYgIWNvbW1hbmQuX2VuYWJsZVBvc2l0aW9uYWxPcHRpb25zKTtcbiAgICAgIHN1Z2dlc3Rpb24gPSBzdWdnZXN0U2ltaWxhcihmbGFnLCBjYW5kaWRhdGVGbGFncyk7XG4gICAgfVxuXG4gICAgY29uc3QgbWVzc2FnZSA9IGBlcnJvcjogdW5rbm93biBvcHRpb24gJyR7ZmxhZ30nJHtzdWdnZXN0aW9ufWA7XG4gICAgdGhpcy5lcnJvcihtZXNzYWdlLCB7IGNvZGU6ICdjb21tYW5kZXIudW5rbm93bk9wdGlvbicgfSk7XG4gIH1cblxuICAvKipcbiAgICogRXhjZXNzIGFyZ3VtZW50cywgbW9yZSB0aGFuIGV4cGVjdGVkLlxuICAgKlxuICAgKiBAcGFyYW0ge3N0cmluZ1tdfSByZWNlaXZlZEFyZ3NcbiAgICogQHByaXZhdGVcbiAgICovXG5cbiAgX2V4Y2Vzc0FyZ3VtZW50cyhyZWNlaXZlZEFyZ3MpIHtcbiAgICBpZiAodGhpcy5fYWxsb3dFeGNlc3NBcmd1bWVudHMpIHJldHVybjtcblxuICAgIGNvbnN0IGV4cGVjdGVkID0gdGhpcy5yZWdpc3RlcmVkQXJndW1lbnRzLmxlbmd0aDtcbiAgICBjb25zdCBzID0gZXhwZWN0ZWQgPT09IDEgPyAnJyA6ICdzJztcbiAgICBjb25zdCBmb3JTdWJjb21tYW5kID0gdGhpcy5wYXJlbnQgPyBgIGZvciAnJHt0aGlzLm5hbWUoKX0nYCA6ICcnO1xuICAgIGNvbnN0IG1lc3NhZ2UgPSBgZXJyb3I6IHRvbyBtYW55IGFyZ3VtZW50cyR7Zm9yU3ViY29tbWFuZH0uIEV4cGVjdGVkICR7ZXhwZWN0ZWR9IGFyZ3VtZW50JHtzfSBidXQgZ290ICR7cmVjZWl2ZWRBcmdzLmxlbmd0aH0uYDtcbiAgICB0aGlzLmVycm9yKG1lc3NhZ2UsIHsgY29kZTogJ2NvbW1hbmRlci5leGNlc3NBcmd1bWVudHMnIH0pO1xuICB9XG5cbiAgLyoqXG4gICAqIFVua25vd24gY29tbWFuZC5cbiAgICpcbiAgICogQHByaXZhdGVcbiAgICovXG5cbiAgdW5rbm93bkNvbW1hbmQoKSB7XG4gICAgY29uc3QgdW5rbm93bk5hbWUgPSB0aGlzLmFyZ3NbMF07XG4gICAgbGV0IHN1Z2dlc3Rpb24gPSAnJztcblxuICAgIGlmICh0aGlzLl9zaG93U3VnZ2VzdGlvbkFmdGVyRXJyb3IpIHtcbiAgICAgIGNvbnN0IGNhbmRpZGF0ZU5hbWVzID0gW107XG4gICAgICB0aGlzLmNyZWF0ZUhlbHAoKVxuICAgICAgICAudmlzaWJsZUNvbW1hbmRzKHRoaXMpXG4gICAgICAgIC5mb3JFYWNoKChjb21tYW5kKSA9PiB7XG4gICAgICAgICAgY2FuZGlkYXRlTmFtZXMucHVzaChjb21tYW5kLm5hbWUoKSk7XG4gICAgICAgICAgLy8ganVzdCB2aXNpYmxlIGFsaWFzXG4gICAgICAgICAgaWYgKGNvbW1hbmQuYWxpYXMoKSkgY2FuZGlkYXRlTmFtZXMucHVzaChjb21tYW5kLmFsaWFzKCkpO1xuICAgICAgICB9KTtcbiAgICAgIHN1Z2dlc3Rpb24gPSBzdWdnZXN0U2ltaWxhcih1bmtub3duTmFtZSwgY2FuZGlkYXRlTmFtZXMpO1xuICAgIH1cblxuICAgIGNvbnN0IG1lc3NhZ2UgPSBgZXJyb3I6IHVua25vd24gY29tbWFuZCAnJHt1bmtub3duTmFtZX0nJHtzdWdnZXN0aW9ufWA7XG4gICAgdGhpcy5lcnJvcihtZXNzYWdlLCB7IGNvZGU6ICdjb21tYW5kZXIudW5rbm93bkNvbW1hbmQnIH0pO1xuICB9XG5cbiAgLyoqXG4gICAqIEdldCBvciBzZXQgdGhlIHByb2dyYW0gdmVyc2lvbi5cbiAgICpcbiAgICogVGhpcyBtZXRob2QgYXV0by1yZWdpc3RlcnMgdGhlIFwiLVYsIC0tdmVyc2lvblwiIG9wdGlvbiB3aGljaCB3aWxsIHByaW50IHRoZSB2ZXJzaW9uIG51bWJlci5cbiAgICpcbiAgICogWW91IGNhbiBvcHRpb25hbGx5IHN1cHBseSB0aGUgZmxhZ3MgYW5kIGRlc2NyaXB0aW9uIHRvIG92ZXJyaWRlIHRoZSBkZWZhdWx0cy5cbiAgICpcbiAgICogQHBhcmFtIHtzdHJpbmd9IFtzdHJdXG4gICAqIEBwYXJhbSB7c3RyaW5nfSBbZmxhZ3NdXG4gICAqIEBwYXJhbSB7c3RyaW5nfSBbZGVzY3JpcHRpb25dXG4gICAqIEByZXR1cm4geyh0aGlzIHwgc3RyaW5nIHwgdW5kZWZpbmVkKX0gYHRoaXNgIGNvbW1hbmQgZm9yIGNoYWluaW5nLCBvciB2ZXJzaW9uIHN0cmluZyBpZiBubyBhcmd1bWVudHNcbiAgICovXG5cbiAgdmVyc2lvbihzdHIsIGZsYWdzLCBkZXNjcmlwdGlvbikge1xuICAgIGlmIChzdHIgPT09IHVuZGVmaW5lZCkgcmV0dXJuIHRoaXMuX3ZlcnNpb247XG4gICAgdGhpcy5fdmVyc2lvbiA9IHN0cjtcbiAgICBmbGFncyA9IGZsYWdzIHx8ICctViwgLS12ZXJzaW9uJztcbiAgICBkZXNjcmlwdGlvbiA9IGRlc2NyaXB0aW9uIHx8ICdvdXRwdXQgdGhlIHZlcnNpb24gbnVtYmVyJztcbiAgICBjb25zdCB2ZXJzaW9uT3B0aW9uID0gdGhpcy5jcmVhdGVPcHRpb24oZmxhZ3MsIGRlc2NyaXB0aW9uKTtcbiAgICB0aGlzLl92ZXJzaW9uT3B0aW9uTmFtZSA9IHZlcnNpb25PcHRpb24uYXR0cmlidXRlTmFtZSgpO1xuICAgIHRoaXMuX3JlZ2lzdGVyT3B0aW9uKHZlcnNpb25PcHRpb24pO1xuXG4gICAgdGhpcy5vbignb3B0aW9uOicgKyB2ZXJzaW9uT3B0aW9uLm5hbWUoKSwgKCkgPT4ge1xuICAgICAgdGhpcy5fb3V0cHV0Q29uZmlndXJhdGlvbi53cml0ZU91dChgJHtzdHJ9XFxuYCk7XG4gICAgICB0aGlzLl9leGl0KDAsICdjb21tYW5kZXIudmVyc2lvbicsIHN0cik7XG4gICAgfSk7XG4gICAgcmV0dXJuIHRoaXM7XG4gIH1cblxuICAvKipcbiAgICogU2V0IHRoZSBkZXNjcmlwdGlvbi5cbiAgICpcbiAgICogQHBhcmFtIHtzdHJpbmd9IFtzdHJdXG4gICAqIEBwYXJhbSB7b2JqZWN0fSBbYXJnc0Rlc2NyaXB0aW9uXVxuICAgKiBAcmV0dXJuIHsoc3RyaW5nfENvbW1hbmQpfVxuICAgKi9cbiAgZGVzY3JpcHRpb24oc3RyLCBhcmdzRGVzY3JpcHRpb24pIHtcbiAgICBpZiAoc3RyID09PSB1bmRlZmluZWQgJiYgYXJnc0Rlc2NyaXB0aW9uID09PSB1bmRlZmluZWQpXG4gICAgICByZXR1cm4gdGhpcy5fZGVzY3JpcHRpb247XG4gICAgdGhpcy5fZGVzY3JpcHRpb24gPSBzdHI7XG4gICAgaWYgKGFyZ3NEZXNjcmlwdGlvbikge1xuICAgICAgdGhpcy5fYXJnc0Rlc2NyaXB0aW9uID0gYXJnc0Rlc2NyaXB0aW9uO1xuICAgIH1cbiAgICByZXR1cm4gdGhpcztcbiAgfVxuXG4gIC8qKlxuICAgKiBTZXQgdGhlIHN1bW1hcnkuIFVzZWQgd2hlbiBsaXN0ZWQgYXMgc3ViY29tbWFuZCBvZiBwYXJlbnQuXG4gICAqXG4gICAqIEBwYXJhbSB7c3RyaW5nfSBbc3RyXVxuICAgKiBAcmV0dXJuIHsoc3RyaW5nfENvbW1hbmQpfVxuICAgKi9cbiAgc3VtbWFyeShzdHIpIHtcbiAgICBpZiAoc3RyID09PSB1bmRlZmluZWQpIHJldHVybiB0aGlzLl9zdW1tYXJ5O1xuICAgIHRoaXMuX3N1bW1hcnkgPSBzdHI7XG4gICAgcmV0dXJuIHRoaXM7XG4gIH1cblxuICAvKipcbiAgICogU2V0IGFuIGFsaWFzIGZvciB0aGUgY29tbWFuZC5cbiAgICpcbiAgICogWW91IG1heSBjYWxsIG1vcmUgdGhhbiBvbmNlIHRvIGFkZCBtdWx0aXBsZSBhbGlhc2VzLiBPbmx5IHRoZSBmaXJzdCBhbGlhcyBpcyBzaG93biBpbiB0aGUgYXV0by1nZW5lcmF0ZWQgaGVscC5cbiAgICpcbiAgICogQHBhcmFtIHtzdHJpbmd9IFthbGlhc11cbiAgICogQHJldHVybiB7KHN0cmluZ3xDb21tYW5kKX1cbiAgICovXG5cbiAgYWxpYXMoYWxpYXMpIHtcbiAgICBpZiAoYWxpYXMgPT09IHVuZGVmaW5lZCkgcmV0dXJuIHRoaXMuX2FsaWFzZXNbMF07IC8vIGp1c3QgcmV0dXJuIGZpcnN0LCBmb3IgYmFja3dhcmRzIGNvbXBhdGliaWxpdHlcblxuICAgIC8qKiBAdHlwZSB7Q29tbWFuZH0gKi9cbiAgICAvLyBlc2xpbnQtZGlzYWJsZS1uZXh0LWxpbmUgQHR5cGVzY3JpcHQtZXNsaW50L25vLXRoaXMtYWxpYXNcbiAgICBsZXQgY29tbWFuZCA9IHRoaXM7XG4gICAgaWYgKFxuICAgICAgdGhpcy5jb21tYW5kcy5sZW5ndGggIT09IDAgJiZcbiAgICAgIHRoaXMuY29tbWFuZHNbdGhpcy5jb21tYW5kcy5sZW5ndGggLSAxXS5fZXhlY3V0YWJsZUhhbmRsZXJcbiAgICApIHtcbiAgICAgIC8vIGFzc3VtZSBhZGRpbmcgYWxpYXMgZm9yIGxhc3QgYWRkZWQgZXhlY3V0YWJsZSBzdWJjb21tYW5kLCByYXRoZXIgdGhhbiB0aGlzXG4gICAgICBjb21tYW5kID0gdGhpcy5jb21tYW5kc1t0aGlzLmNvbW1hbmRzLmxlbmd0aCAtIDFdO1xuICAgIH1cblxuICAgIGlmIChhbGlhcyA9PT0gY29tbWFuZC5fbmFtZSlcbiAgICAgIHRocm93IG5ldyBFcnJvcihcIkNvbW1hbmQgYWxpYXMgY2FuJ3QgYmUgdGhlIHNhbWUgYXMgaXRzIG5hbWVcIik7XG4gICAgY29uc3QgbWF0Y2hpbmdDb21tYW5kID0gdGhpcy5wYXJlbnQ/Ll9maW5kQ29tbWFuZChhbGlhcyk7XG4gICAgaWYgKG1hdGNoaW5nQ29tbWFuZCkge1xuICAgICAgLy8gYy5mLiBfcmVnaXN0ZXJDb21tYW5kXG4gICAgICBjb25zdCBleGlzdGluZ0NtZCA9IFttYXRjaGluZ0NvbW1hbmQubmFtZSgpXVxuICAgICAgICAuY29uY2F0KG1hdGNoaW5nQ29tbWFuZC5hbGlhc2VzKCkpXG4gICAgICAgIC5qb2luKCd8Jyk7XG4gICAgICB0aHJvdyBuZXcgRXJyb3IoXG4gICAgICAgIGBjYW5ub3QgYWRkIGFsaWFzICcke2FsaWFzfScgdG8gY29tbWFuZCAnJHt0aGlzLm5hbWUoKX0nIGFzIGFscmVhZHkgaGF2ZSBjb21tYW5kICcke2V4aXN0aW5nQ21kfSdgLFxuICAgICAgKTtcbiAgICB9XG5cbiAgICBjb21tYW5kLl9hbGlhc2VzLnB1c2goYWxpYXMpO1xuICAgIHJldHVybiB0aGlzO1xuICB9XG5cbiAgLyoqXG4gICAqIFNldCBhbGlhc2VzIGZvciB0aGUgY29tbWFuZC5cbiAgICpcbiAgICogT25seSB0aGUgZmlyc3QgYWxpYXMgaXMgc2hvd24gaW4gdGhlIGF1dG8tZ2VuZXJhdGVkIGhlbHAuXG4gICAqXG4gICAqIEBwYXJhbSB7c3RyaW5nW119IFthbGlhc2VzXVxuICAgKiBAcmV0dXJuIHsoc3RyaW5nW118Q29tbWFuZCl9XG4gICAqL1xuXG4gIGFsaWFzZXMoYWxpYXNlcykge1xuICAgIC8vIEdldHRlciBmb3IgdGhlIGFycmF5IG9mIGFsaWFzZXMgaXMgdGhlIG1haW4gcmVhc29uIGZvciBoYXZpbmcgYWxpYXNlcygpIGluIGFkZGl0aW9uIHRvIGFsaWFzKCkuXG4gICAgaWYgKGFsaWFzZXMgPT09IHVuZGVmaW5lZCkgcmV0dXJuIHRoaXMuX2FsaWFzZXM7XG5cbiAgICBhbGlhc2VzLmZvckVhY2goKGFsaWFzKSA9PiB0aGlzLmFsaWFzKGFsaWFzKSk7XG4gICAgcmV0dXJuIHRoaXM7XG4gIH1cblxuICAvKipcbiAgICogU2V0IC8gZ2V0IHRoZSBjb21tYW5kIHVzYWdlIGBzdHJgLlxuICAgKlxuICAgKiBAcGFyYW0ge3N0cmluZ30gW3N0cl1cbiAgICogQHJldHVybiB7KHN0cmluZ3xDb21tYW5kKX1cbiAgICovXG5cbiAgdXNhZ2Uoc3RyKSB7XG4gICAgaWYgKHN0ciA9PT0gdW5kZWZpbmVkKSB7XG4gICAgICBpZiAodGhpcy5fdXNhZ2UpIHJldHVybiB0aGlzLl91c2FnZTtcblxuICAgICAgY29uc3QgYXJncyA9IHRoaXMucmVnaXN0ZXJlZEFyZ3VtZW50cy5tYXAoKGFyZykgPT4ge1xuICAgICAgICByZXR1cm4gaHVtYW5SZWFkYWJsZUFyZ05hbWUoYXJnKTtcbiAgICAgIH0pO1xuICAgICAgcmV0dXJuIFtdXG4gICAgICAgIC5jb25jYXQoXG4gICAgICAgICAgdGhpcy5vcHRpb25zLmxlbmd0aCB8fCB0aGlzLl9oZWxwT3B0aW9uICE9PSBudWxsID8gJ1tvcHRpb25zXScgOiBbXSxcbiAgICAgICAgICB0aGlzLmNvbW1hbmRzLmxlbmd0aCA/ICdbY29tbWFuZF0nIDogW10sXG4gICAgICAgICAgdGhpcy5yZWdpc3RlcmVkQXJndW1lbnRzLmxlbmd0aCA/IGFyZ3MgOiBbXSxcbiAgICAgICAgKVxuICAgICAgICAuam9pbignICcpO1xuICAgIH1cblxuICAgIHRoaXMuX3VzYWdlID0gc3RyO1xuICAgIHJldHVybiB0aGlzO1xuICB9XG5cbiAgLyoqXG4gICAqIEdldCBvciBzZXQgdGhlIG5hbWUgb2YgdGhlIGNvbW1hbmQuXG4gICAqXG4gICAqIEBwYXJhbSB7c3RyaW5nfSBbc3RyXVxuICAgKiBAcmV0dXJuIHsoc3RyaW5nfENvbW1hbmQpfVxuICAgKi9cblxuICBuYW1lKHN0cikge1xuICAgIGlmIChzdHIgPT09IHVuZGVmaW5lZCkgcmV0dXJuIHRoaXMuX25hbWU7XG4gICAgdGhpcy5fbmFtZSA9IHN0cjtcbiAgICByZXR1cm4gdGhpcztcbiAgfVxuXG4gIC8qKlxuICAgKiBTZXQgdGhlIG5hbWUgb2YgdGhlIGNvbW1hbmQgZnJvbSBzY3JpcHQgZmlsZW5hbWUsIHN1Y2ggYXMgcHJvY2Vzcy5hcmd2WzFdLFxuICAgKiBvciByZXF1aXJlLm1haW4uZmlsZW5hbWUsIG9yIF9fZmlsZW5hbWUuXG4gICAqXG4gICAqIChVc2VkIGludGVybmFsbHkgYW5kIHB1YmxpYyBhbHRob3VnaCBub3QgZG9jdW1lbnRlZCBpbiBSRUFETUUuKVxuICAgKlxuICAgKiBAZXhhbXBsZVxuICAgKiBwcm9ncmFtLm5hbWVGcm9tRmlsZW5hbWUocmVxdWlyZS5tYWluLmZpbGVuYW1lKTtcbiAgICpcbiAgICogQHBhcmFtIHtzdHJpbmd9IGZpbGVuYW1lXG4gICAqIEByZXR1cm4ge0NvbW1hbmR9XG4gICAqL1xuXG4gIG5hbWVGcm9tRmlsZW5hbWUoZmlsZW5hbWUpIHtcbiAgICB0aGlzLl9uYW1lID0gcGF0aC5iYXNlbmFtZShmaWxlbmFtZSwgcGF0aC5leHRuYW1lKGZpbGVuYW1lKSk7XG5cbiAgICByZXR1cm4gdGhpcztcbiAgfVxuXG4gIC8qKlxuICAgKiBHZXQgb3Igc2V0IHRoZSBkaXJlY3RvcnkgZm9yIHNlYXJjaGluZyBmb3IgZXhlY3V0YWJsZSBzdWJjb21tYW5kcyBvZiB0aGlzIGNvbW1hbmQuXG4gICAqXG4gICAqIEBleGFtcGxlXG4gICAqIHByb2dyYW0uZXhlY3V0YWJsZURpcihfX2Rpcm5hbWUpO1xuICAgKiAvLyBvclxuICAgKiBwcm9ncmFtLmV4ZWN1dGFibGVEaXIoJ3N1YmNvbW1hbmRzJyk7XG4gICAqXG4gICAqIEBwYXJhbSB7c3RyaW5nfSBbcGF0aF1cbiAgICogQHJldHVybiB7KHN0cmluZ3xudWxsfENvbW1hbmQpfVxuICAgKi9cblxuICBleGVjdXRhYmxlRGlyKHBhdGgpIHtcbiAgICBpZiAocGF0aCA9PT0gdW5kZWZpbmVkKSByZXR1cm4gdGhpcy5fZXhlY3V0YWJsZURpcjtcbiAgICB0aGlzLl9leGVjdXRhYmxlRGlyID0gcGF0aDtcbiAgICByZXR1cm4gdGhpcztcbiAgfVxuXG4gIC8qKlxuICAgKiBSZXR1cm4gcHJvZ3JhbSBoZWxwIGRvY3VtZW50YXRpb24uXG4gICAqXG4gICAqIEBwYXJhbSB7eyBlcnJvcjogYm9vbGVhbiB9fSBbY29udGV4dE9wdGlvbnNdIC0gcGFzcyB7ZXJyb3I6dHJ1ZX0gdG8gd3JhcCBmb3Igc3RkZXJyIGluc3RlYWQgb2Ygc3Rkb3V0XG4gICAqIEByZXR1cm4ge3N0cmluZ31cbiAgICovXG5cbiAgaGVscEluZm9ybWF0aW9uKGNvbnRleHRPcHRpb25zKSB7XG4gICAgY29uc3QgaGVscGVyID0gdGhpcy5jcmVhdGVIZWxwKCk7XG4gICAgaWYgKGhlbHBlci5oZWxwV2lkdGggPT09IHVuZGVmaW5lZCkge1xuICAgICAgaGVscGVyLmhlbHBXaWR0aCA9XG4gICAgICAgIGNvbnRleHRPcHRpb25zICYmIGNvbnRleHRPcHRpb25zLmVycm9yXG4gICAgICAgICAgPyB0aGlzLl9vdXRwdXRDb25maWd1cmF0aW9uLmdldEVyckhlbHBXaWR0aCgpXG4gICAgICAgICAgOiB0aGlzLl9vdXRwdXRDb25maWd1cmF0aW9uLmdldE91dEhlbHBXaWR0aCgpO1xuICAgIH1cbiAgICByZXR1cm4gaGVscGVyLmZvcm1hdEhlbHAodGhpcywgaGVscGVyKTtcbiAgfVxuXG4gIC8qKlxuICAgKiBAcHJpdmF0ZVxuICAgKi9cblxuICBfZ2V0SGVscENvbnRleHQoY29udGV4dE9wdGlvbnMpIHtcbiAgICBjb250ZXh0T3B0aW9ucyA9IGNvbnRleHRPcHRpb25zIHx8IHt9O1xuICAgIGNvbnN0IGNvbnRleHQgPSB7IGVycm9yOiAhIWNvbnRleHRPcHRpb25zLmVycm9yIH07XG4gICAgbGV0IHdyaXRlO1xuICAgIGlmIChjb250ZXh0LmVycm9yKSB7XG4gICAgICB3cml0ZSA9IChhcmcpID0+IHRoaXMuX291dHB1dENvbmZpZ3VyYXRpb24ud3JpdGVFcnIoYXJnKTtcbiAgICB9IGVsc2Uge1xuICAgICAgd3JpdGUgPSAoYXJnKSA9PiB0aGlzLl9vdXRwdXRDb25maWd1cmF0aW9uLndyaXRlT3V0KGFyZyk7XG4gICAgfVxuICAgIGNvbnRleHQud3JpdGUgPSBjb250ZXh0T3B0aW9ucy53cml0ZSB8fCB3cml0ZTtcbiAgICBjb250ZXh0LmNvbW1hbmQgPSB0aGlzO1xuICAgIHJldHVybiBjb250ZXh0O1xuICB9XG5cbiAgLyoqXG4gICAqIE91dHB1dCBoZWxwIGluZm9ybWF0aW9uIGZvciB0aGlzIGNvbW1hbmQuXG4gICAqXG4gICAqIE91dHB1dHMgYnVpbHQtaW4gaGVscCwgYW5kIGN1c3RvbSB0ZXh0IGFkZGVkIHVzaW5nIGAuYWRkSGVscFRleHQoKWAuXG4gICAqXG4gICAqIEBwYXJhbSB7eyBlcnJvcjogYm9vbGVhbiB9IHwgRnVuY3Rpb259IFtjb250ZXh0T3B0aW9uc10gLSBwYXNzIHtlcnJvcjp0cnVlfSB0byB3cml0ZSB0byBzdGRlcnIgaW5zdGVhZCBvZiBzdGRvdXRcbiAgICovXG5cbiAgb3V0cHV0SGVscChjb250ZXh0T3B0aW9ucykge1xuICAgIGxldCBkZXByZWNhdGVkQ2FsbGJhY2s7XG4gICAgaWYgKHR5cGVvZiBjb250ZXh0T3B0aW9ucyA9PT0gJ2Z1bmN0aW9uJykge1xuICAgICAgZGVwcmVjYXRlZENhbGxiYWNrID0gY29udGV4dE9wdGlvbnM7XG4gICAgICBjb250ZXh0T3B0aW9ucyA9IHVuZGVmaW5lZDtcbiAgICB9XG4gICAgY29uc3QgY29udGV4dCA9IHRoaXMuX2dldEhlbHBDb250ZXh0KGNvbnRleHRPcHRpb25zKTtcblxuICAgIHRoaXMuX2dldENvbW1hbmRBbmRBbmNlc3RvcnMoKVxuICAgICAgLnJldmVyc2UoKVxuICAgICAgLmZvckVhY2goKGNvbW1hbmQpID0+IGNvbW1hbmQuZW1pdCgnYmVmb3JlQWxsSGVscCcsIGNvbnRleHQpKTtcbiAgICB0aGlzLmVtaXQoJ2JlZm9yZUhlbHAnLCBjb250ZXh0KTtcblxuICAgIGxldCBoZWxwSW5mb3JtYXRpb24gPSB0aGlzLmhlbHBJbmZvcm1hdGlvbihjb250ZXh0KTtcbiAgICBpZiAoZGVwcmVjYXRlZENhbGxiYWNrKSB7XG4gICAgICBoZWxwSW5mb3JtYXRpb24gPSBkZXByZWNhdGVkQ2FsbGJhY2soaGVscEluZm9ybWF0aW9uKTtcbiAgICAgIGlmIChcbiAgICAgICAgdHlwZW9mIGhlbHBJbmZvcm1hdGlvbiAhPT0gJ3N0cmluZycgJiZcbiAgICAgICAgIUJ1ZmZlci5pc0J1ZmZlcihoZWxwSW5mb3JtYXRpb24pXG4gICAgICApIHtcbiAgICAgICAgdGhyb3cgbmV3IEVycm9yKCdvdXRwdXRIZWxwIGNhbGxiYWNrIG11c3QgcmV0dXJuIGEgc3RyaW5nIG9yIGEgQnVmZmVyJyk7XG4gICAgICB9XG4gICAgfVxuICAgIGNvbnRleHQud3JpdGUoaGVscEluZm9ybWF0aW9uKTtcblxuICAgIGlmICh0aGlzLl9nZXRIZWxwT3B0aW9uKCk/LmxvbmcpIHtcbiAgICAgIHRoaXMuZW1pdCh0aGlzLl9nZXRIZWxwT3B0aW9uKCkubG9uZyk7IC8vIGRlcHJlY2F0ZWRcbiAgICB9XG4gICAgdGhpcy5lbWl0KCdhZnRlckhlbHAnLCBjb250ZXh0KTtcbiAgICB0aGlzLl9nZXRDb21tYW5kQW5kQW5jZXN0b3JzKCkuZm9yRWFjaCgoY29tbWFuZCkgPT5cbiAgICAgIGNvbW1hbmQuZW1pdCgnYWZ0ZXJBbGxIZWxwJywgY29udGV4dCksXG4gICAgKTtcbiAgfVxuXG4gIC8qKlxuICAgKiBZb3UgY2FuIHBhc3MgaW4gZmxhZ3MgYW5kIGEgZGVzY3JpcHRpb24gdG8gY3VzdG9taXNlIHRoZSBidWlsdC1pbiBoZWxwIG9wdGlvbi5cbiAgICogUGFzcyBpbiBmYWxzZSB0byBkaXNhYmxlIHRoZSBidWlsdC1pbiBoZWxwIG9wdGlvbi5cbiAgICpcbiAgICogQGV4YW1wbGVcbiAgICogcHJvZ3JhbS5oZWxwT3B0aW9uKCctPywgLS1oZWxwJyAnc2hvdyBoZWxwJyk7IC8vIGN1c3RvbWlzZVxuICAgKiBwcm9ncmFtLmhlbHBPcHRpb24oZmFsc2UpOyAvLyBkaXNhYmxlXG4gICAqXG4gICAqIEBwYXJhbSB7KHN0cmluZyB8IGJvb2xlYW4pfSBmbGFnc1xuICAgKiBAcGFyYW0ge3N0cmluZ30gW2Rlc2NyaXB0aW9uXVxuICAgKiBAcmV0dXJuIHtDb21tYW5kfSBgdGhpc2AgY29tbWFuZCBmb3IgY2hhaW5pbmdcbiAgICovXG5cbiAgaGVscE9wdGlvbihmbGFncywgZGVzY3JpcHRpb24pIHtcbiAgICAvLyBTdXBwb3J0IGRpc2FibGluZyBidWlsdC1pbiBoZWxwIG9wdGlvbi5cbiAgICBpZiAodHlwZW9mIGZsYWdzID09PSAnYm9vbGVhbicpIHtcbiAgICAgIGlmIChmbGFncykge1xuICAgICAgICB0aGlzLl9oZWxwT3B0aW9uID0gdGhpcy5faGVscE9wdGlvbiA/PyB1bmRlZmluZWQ7IC8vIHByZXNlcnZlIGV4aXN0aW5nIG9wdGlvblxuICAgICAgfSBlbHNlIHtcbiAgICAgICAgdGhpcy5faGVscE9wdGlvbiA9IG51bGw7IC8vIGRpc2FibGVcbiAgICAgIH1cbiAgICAgIHJldHVybiB0aGlzO1xuICAgIH1cblxuICAgIC8vIEN1c3RvbWlzZSBmbGFncyBhbmQgZGVzY3JpcHRpb24uXG4gICAgZmxhZ3MgPSBmbGFncyA/PyAnLWgsIC0taGVscCc7XG4gICAgZGVzY3JpcHRpb24gPSBkZXNjcmlwdGlvbiA/PyAnZGlzcGxheSBoZWxwIGZvciBjb21tYW5kJztcbiAgICB0aGlzLl9oZWxwT3B0aW9uID0gdGhpcy5jcmVhdGVPcHRpb24oZmxhZ3MsIGRlc2NyaXB0aW9uKTtcblxuICAgIHJldHVybiB0aGlzO1xuICB9XG5cbiAgLyoqXG4gICAqIExhenkgY3JlYXRlIGhlbHAgb3B0aW9uLlxuICAgKiBSZXR1cm5zIG51bGwgaWYgaGFzIGJlZW4gZGlzYWJsZWQgd2l0aCAuaGVscE9wdGlvbihmYWxzZSkuXG4gICAqXG4gICAqIEByZXR1cm5zIHsoT3B0aW9uIHwgbnVsbCl9IHRoZSBoZWxwIG9wdGlvblxuICAgKiBAcGFja2FnZVxuICAgKi9cbiAgX2dldEhlbHBPcHRpb24oKSB7XG4gICAgLy8gTGF6eSBjcmVhdGUgaGVscCBvcHRpb24gb24gZGVtYW5kLlxuICAgIGlmICh0aGlzLl9oZWxwT3B0aW9uID09PSB1bmRlZmluZWQpIHtcbiAgICAgIHRoaXMuaGVscE9wdGlvbih1bmRlZmluZWQsIHVuZGVmaW5lZCk7XG4gICAgfVxuICAgIHJldHVybiB0aGlzLl9oZWxwT3B0aW9uO1xuICB9XG5cbiAgLyoqXG4gICAqIFN1cHBseSB5b3VyIG93biBvcHRpb24gdG8gdXNlIGZvciB0aGUgYnVpbHQtaW4gaGVscCBvcHRpb24uXG4gICAqIFRoaXMgaXMgYW4gYWx0ZXJuYXRpdmUgdG8gdXNpbmcgaGVscE9wdGlvbigpIHRvIGN1c3RvbWlzZSB0aGUgZmxhZ3MgYW5kIGRlc2NyaXB0aW9uIGV0Yy5cbiAgICpcbiAgICogQHBhcmFtIHtPcHRpb259IG9wdGlvblxuICAgKiBAcmV0dXJuIHtDb21tYW5kfSBgdGhpc2AgY29tbWFuZCBmb3IgY2hhaW5pbmdcbiAgICovXG4gIGFkZEhlbHBPcHRpb24ob3B0aW9uKSB7XG4gICAgdGhpcy5faGVscE9wdGlvbiA9IG9wdGlvbjtcbiAgICByZXR1cm4gdGhpcztcbiAgfVxuXG4gIC8qKlxuICAgKiBPdXRwdXQgaGVscCBpbmZvcm1hdGlvbiBhbmQgZXhpdC5cbiAgICpcbiAgICogT3V0cHV0cyBidWlsdC1pbiBoZWxwLCBhbmQgY3VzdG9tIHRleHQgYWRkZWQgdXNpbmcgYC5hZGRIZWxwVGV4dCgpYC5cbiAgICpcbiAgICogQHBhcmFtIHt7IGVycm9yOiBib29sZWFuIH19IFtjb250ZXh0T3B0aW9uc10gLSBwYXNzIHtlcnJvcjp0cnVlfSB0byB3cml0ZSB0byBzdGRlcnIgaW5zdGVhZCBvZiBzdGRvdXRcbiAgICovXG5cbiAgaGVscChjb250ZXh0T3B0aW9ucykge1xuICAgIHRoaXMub3V0cHV0SGVscChjb250ZXh0T3B0aW9ucyk7XG4gICAgbGV0IGV4aXRDb2RlID0gcHJvY2Vzcy5leGl0Q29kZSB8fCAwO1xuICAgIGlmIChcbiAgICAgIGV4aXRDb2RlID09PSAwICYmXG4gICAgICBjb250ZXh0T3B0aW9ucyAmJlxuICAgICAgdHlwZW9mIGNvbnRleHRPcHRpb25zICE9PSAnZnVuY3Rpb24nICYmXG4gICAgICBjb250ZXh0T3B0aW9ucy5lcnJvclxuICAgICkge1xuICAgICAgZXhpdENvZGUgPSAxO1xuICAgIH1cbiAgICAvLyBtZXNzYWdlOiBkbyBub3QgaGF2ZSBhbGwgZGlzcGxheWVkIHRleHQgYXZhaWxhYmxlIHNvIG9ubHkgcGFzc2luZyBwbGFjZWhvbGRlci5cbiAgICB0aGlzLl9leGl0KGV4aXRDb2RlLCAnY29tbWFuZGVyLmhlbHAnLCAnKG91dHB1dEhlbHApJyk7XG4gIH1cblxuICAvKipcbiAgICogQWRkIGFkZGl0aW9uYWwgdGV4dCB0byBiZSBkaXNwbGF5ZWQgd2l0aCB0aGUgYnVpbHQtaW4gaGVscC5cbiAgICpcbiAgICogUG9zaXRpb24gaXMgJ2JlZm9yZScgb3IgJ2FmdGVyJyB0byBhZmZlY3QganVzdCB0aGlzIGNvbW1hbmQsXG4gICAqIGFuZCAnYmVmb3JlQWxsJyBvciAnYWZ0ZXJBbGwnIHRvIGFmZmVjdCB0aGlzIGNvbW1hbmQgYW5kIGFsbCBpdHMgc3ViY29tbWFuZHMuXG4gICAqXG4gICAqIEBwYXJhbSB7c3RyaW5nfSBwb3NpdGlvbiAtIGJlZm9yZSBvciBhZnRlciBidWlsdC1pbiBoZWxwXG4gICAqIEBwYXJhbSB7KHN0cmluZyB8IEZ1bmN0aW9uKX0gdGV4dCAtIHN0cmluZyB0byBhZGQsIG9yIGEgZnVuY3Rpb24gcmV0dXJuaW5nIGEgc3RyaW5nXG4gICAqIEByZXR1cm4ge0NvbW1hbmR9IGB0aGlzYCBjb21tYW5kIGZvciBjaGFpbmluZ1xuICAgKi9cbiAgYWRkSGVscFRleHQocG9zaXRpb24sIHRleHQpIHtcbiAgICBjb25zdCBhbGxvd2VkVmFsdWVzID0gWydiZWZvcmVBbGwnLCAnYmVmb3JlJywgJ2FmdGVyJywgJ2FmdGVyQWxsJ107XG4gICAgaWYgKCFhbGxvd2VkVmFsdWVzLmluY2x1ZGVzKHBvc2l0aW9uKSkge1xuICAgICAgdGhyb3cgbmV3IEVycm9yKGBVbmV4cGVjdGVkIHZhbHVlIGZvciBwb3NpdGlvbiB0byBhZGRIZWxwVGV4dC5cbkV4cGVjdGluZyBvbmUgb2YgJyR7YWxsb3dlZFZhbHVlcy5qb2luKFwiJywgJ1wiKX0nYCk7XG4gICAgfVxuICAgIGNvbnN0IGhlbHBFdmVudCA9IGAke3Bvc2l0aW9ufUhlbHBgO1xuICAgIHRoaXMub24oaGVscEV2ZW50LCAoY29udGV4dCkgPT4ge1xuICAgICAgbGV0IGhlbHBTdHI7XG4gICAgICBpZiAodHlwZW9mIHRleHQgPT09ICdmdW5jdGlvbicpIHtcbiAgICAgICAgaGVscFN0ciA9IHRleHQoeyBlcnJvcjogY29udGV4dC5lcnJvciwgY29tbWFuZDogY29udGV4dC5jb21tYW5kIH0pO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgaGVscFN0ciA9IHRleHQ7XG4gICAgICB9XG4gICAgICAvLyBJZ25vcmUgZmFsc3kgdmFsdWUgd2hlbiBub3RoaW5nIHRvIG91dHB1dC5cbiAgICAgIGlmIChoZWxwU3RyKSB7XG4gICAgICAgIGNvbnRleHQud3JpdGUoYCR7aGVscFN0cn1cXG5gKTtcbiAgICAgIH1cbiAgICB9KTtcbiAgICByZXR1cm4gdGhpcztcbiAgfVxuXG4gIC8qKlxuICAgKiBPdXRwdXQgaGVscCBpbmZvcm1hdGlvbiBpZiBoZWxwIGZsYWdzIHNwZWNpZmllZFxuICAgKlxuICAgKiBAcGFyYW0ge0FycmF5fSBhcmdzIC0gYXJyYXkgb2Ygb3B0aW9ucyB0byBzZWFyY2ggZm9yIGhlbHAgZmxhZ3NcbiAgICogQHByaXZhdGVcbiAgICovXG5cbiAgX291dHB1dEhlbHBJZlJlcXVlc3RlZChhcmdzKSB7XG4gICAgY29uc3QgaGVscE9wdGlvbiA9IHRoaXMuX2dldEhlbHBPcHRpb24oKTtcbiAgICBjb25zdCBoZWxwUmVxdWVzdGVkID0gaGVscE9wdGlvbiAmJiBhcmdzLmZpbmQoKGFyZykgPT4gaGVscE9wdGlvbi5pcyhhcmcpKTtcbiAgICBpZiAoaGVscFJlcXVlc3RlZCkge1xuICAgICAgdGhpcy5vdXRwdXRIZWxwKCk7XG4gICAgICAvLyAoRG8gbm90IGhhdmUgYWxsIGRpc3BsYXllZCB0ZXh0IGF2YWlsYWJsZSBzbyBvbmx5IHBhc3NpbmcgcGxhY2Vob2xkZXIuKVxuICAgICAgdGhpcy5fZXhpdCgwLCAnY29tbWFuZGVyLmhlbHBEaXNwbGF5ZWQnLCAnKG91dHB1dEhlbHApJyk7XG4gICAgfVxuICB9XG59XG5cbi8qKlxuICogU2NhbiBhcmd1bWVudHMgYW5kIGluY3JlbWVudCBwb3J0IG51bWJlciBmb3IgaW5zcGVjdCBjYWxscyAodG8gYXZvaWQgY29uZmxpY3RzIHdoZW4gc3Bhd25pbmcgbmV3IGNvbW1hbmQpLlxuICpcbiAqIEBwYXJhbSB7c3RyaW5nW119IGFyZ3MgLSBhcnJheSBvZiBhcmd1bWVudHMgZnJvbSBub2RlLmV4ZWNBcmd2XG4gKiBAcmV0dXJucyB7c3RyaW5nW119XG4gKiBAcHJpdmF0ZVxuICovXG5cbmZ1bmN0aW9uIGluY3JlbWVudE5vZGVJbnNwZWN0b3JQb3J0KGFyZ3MpIHtcbiAgLy8gVGVzdGluZyBmb3IgdGhlc2Ugb3B0aW9uczpcbiAgLy8gIC0taW5zcGVjdFs9W2hvc3Q6XXBvcnRdXG4gIC8vICAtLWluc3BlY3QtYnJrWz1baG9zdDpdcG9ydF1cbiAgLy8gIC0taW5zcGVjdC1wb3J0PVtob3N0Ol1wb3J0XG4gIHJldHVybiBhcmdzLm1hcCgoYXJnKSA9PiB7XG4gICAgaWYgKCFhcmcuc3RhcnRzV2l0aCgnLS1pbnNwZWN0JykpIHtcbiAgICAgIHJldHVybiBhcmc7XG4gICAgfVxuICAgIGxldCBkZWJ1Z09wdGlvbjtcbiAgICBsZXQgZGVidWdIb3N0ID0gJzEyNy4wLjAuMSc7XG4gICAgbGV0IGRlYnVnUG9ydCA9ICc5MjI5JztcbiAgICBsZXQgbWF0Y2g7XG4gICAgaWYgKChtYXRjaCA9IGFyZy5tYXRjaCgvXigtLWluc3BlY3QoLWJyayk/KSQvKSkgIT09IG51bGwpIHtcbiAgICAgIC8vIGUuZy4gLS1pbnNwZWN0XG4gICAgICBkZWJ1Z09wdGlvbiA9IG1hdGNoWzFdO1xuICAgIH0gZWxzZSBpZiAoXG4gICAgICAobWF0Y2ggPSBhcmcubWF0Y2goL14oLS1pbnNwZWN0KC1icmt8LXBvcnQpPyk9KFteOl0rKSQvKSkgIT09IG51bGxcbiAgICApIHtcbiAgICAgIGRlYnVnT3B0aW9uID0gbWF0Y2hbMV07XG4gICAgICBpZiAoL15cXGQrJC8udGVzdChtYXRjaFszXSkpIHtcbiAgICAgICAgLy8gZS5nLiAtLWluc3BlY3Q9MTIzNFxuICAgICAgICBkZWJ1Z1BvcnQgPSBtYXRjaFszXTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIC8vIGUuZy4gLS1pbnNwZWN0PWxvY2FsaG9zdFxuICAgICAgICBkZWJ1Z0hvc3QgPSBtYXRjaFszXTtcbiAgICAgIH1cbiAgICB9IGVsc2UgaWYgKFxuICAgICAgKG1hdGNoID0gYXJnLm1hdGNoKC9eKC0taW5zcGVjdCgtYnJrfC1wb3J0KT8pPShbXjpdKyk6KFxcZCspJC8pKSAhPT0gbnVsbFxuICAgICkge1xuICAgICAgLy8gZS5nLiAtLWluc3BlY3Q9bG9jYWxob3N0OjEyMzRcbiAgICAgIGRlYnVnT3B0aW9uID0gbWF0Y2hbMV07XG4gICAgICBkZWJ1Z0hvc3QgPSBtYXRjaFszXTtcbiAgICAgIGRlYnVnUG9ydCA9IG1hdGNoWzRdO1xuICAgIH1cblxuICAgIGlmIChkZWJ1Z09wdGlvbiAmJiBkZWJ1Z1BvcnQgIT09ICcwJykge1xuICAgICAgcmV0dXJuIGAke2RlYnVnT3B0aW9ufT0ke2RlYnVnSG9zdH06JHtwYXJzZUludChkZWJ1Z1BvcnQpICsgMX1gO1xuICAgIH1cbiAgICByZXR1cm4gYXJnO1xuICB9KTtcbn1cblxuZXhwb3J0cy5Db21tYW5kID0gQ29tbWFuZDtcbiIsIi8qKlxuICogQ29tbWFuZGVyRXJyb3IgY2xhc3NcbiAqL1xuY2xhc3MgQ29tbWFuZGVyRXJyb3IgZXh0ZW5kcyBFcnJvciB7XG4gIC8qKlxuICAgKiBDb25zdHJ1Y3RzIHRoZSBDb21tYW5kZXJFcnJvciBjbGFzc1xuICAgKiBAcGFyYW0ge251bWJlcn0gZXhpdENvZGUgc3VnZ2VzdGVkIGV4aXQgY29kZSB3aGljaCBjb3VsZCBiZSB1c2VkIHdpdGggcHJvY2Vzcy5leGl0XG4gICAqIEBwYXJhbSB7c3RyaW5nfSBjb2RlIGFuIGlkIHN0cmluZyByZXByZXNlbnRpbmcgdGhlIGVycm9yXG4gICAqIEBwYXJhbSB7c3RyaW5nfSBtZXNzYWdlIGh1bWFuLXJlYWRhYmxlIGRlc2NyaXB0aW9uIG9mIHRoZSBlcnJvclxuICAgKi9cbiAgY29uc3RydWN0b3IoZXhpdENvZGUsIGNvZGUsIG1lc3NhZ2UpIHtcbiAgICBzdXBlcihtZXNzYWdlKTtcbiAgICAvLyBwcm9wZXJseSBjYXB0dXJlIHN0YWNrIHRyYWNlIGluIE5vZGUuanNcbiAgICBFcnJvci5jYXB0dXJlU3RhY2tUcmFjZSh0aGlzLCB0aGlzLmNvbnN0cnVjdG9yKTtcbiAgICB0aGlzLm5hbWUgPSB0aGlzLmNvbnN0cnVjdG9yLm5hbWU7XG4gICAgdGhpcy5jb2RlID0gY29kZTtcbiAgICB0aGlzLmV4aXRDb2RlID0gZXhpdENvZGU7XG4gICAgdGhpcy5uZXN0ZWRFcnJvciA9IHVuZGVmaW5lZDtcbiAgfVxufVxuXG4vKipcbiAqIEludmFsaWRBcmd1bWVudEVycm9yIGNsYXNzXG4gKi9cbmNsYXNzIEludmFsaWRBcmd1bWVudEVycm9yIGV4dGVuZHMgQ29tbWFuZGVyRXJyb3Ige1xuICAvKipcbiAgICogQ29uc3RydWN0cyB0aGUgSW52YWxpZEFyZ3VtZW50RXJyb3IgY2xhc3NcbiAgICogQHBhcmFtIHtzdHJpbmd9IFttZXNzYWdlXSBleHBsYW5hdGlvbiBvZiB3aHkgYXJndW1lbnQgaXMgaW52YWxpZFxuICAgKi9cbiAgY29uc3RydWN0b3IobWVzc2FnZSkge1xuICAgIHN1cGVyKDEsICdjb21tYW5kZXIuaW52YWxpZEFyZ3VtZW50JywgbWVzc2FnZSk7XG4gICAgLy8gcHJvcGVybHkgY2FwdHVyZSBzdGFjayB0cmFjZSBpbiBOb2RlLmpzXG4gICAgRXJyb3IuY2FwdHVyZVN0YWNrVHJhY2UodGhpcywgdGhpcy5jb25zdHJ1Y3Rvcik7XG4gICAgdGhpcy5uYW1lID0gdGhpcy5jb25zdHJ1Y3Rvci5uYW1lO1xuICB9XG59XG5cbmV4cG9ydHMuQ29tbWFuZGVyRXJyb3IgPSBDb21tYW5kZXJFcnJvcjtcbmV4cG9ydHMuSW52YWxpZEFyZ3VtZW50RXJyb3IgPSBJbnZhbGlkQXJndW1lbnRFcnJvcjtcbiIsImNvbnN0IHsgaHVtYW5SZWFkYWJsZUFyZ05hbWUgfSA9IHJlcXVpcmUoJy4vYXJndW1lbnQuanMnKTtcblxuLyoqXG4gKiBUeXBlU2NyaXB0IGltcG9ydCB0eXBlcyBmb3IgSlNEb2MsIHVzZWQgYnkgVmlzdWFsIFN0dWRpbyBDb2RlIEludGVsbGlTZW5zZSBhbmQgYG5wbSBydW4gdHlwZXNjcmlwdC1jaGVja0pTYFxuICogaHR0cHM6Ly93d3cudHlwZXNjcmlwdGxhbmcub3JnL2RvY3MvaGFuZGJvb2svanNkb2Mtc3VwcG9ydGVkLXR5cGVzLmh0bWwjaW1wb3J0LXR5cGVzXG4gKiBAdHlwZWRlZiB7IGltcG9ydChcIi4vYXJndW1lbnQuanNcIikuQXJndW1lbnQgfSBBcmd1bWVudFxuICogQHR5cGVkZWYgeyBpbXBvcnQoXCIuL2NvbW1hbmQuanNcIikuQ29tbWFuZCB9IENvbW1hbmRcbiAqIEB0eXBlZGVmIHsgaW1wb3J0KFwiLi9vcHRpb24uanNcIikuT3B0aW9uIH0gT3B0aW9uXG4gKi9cblxuLy8gQWx0aG91Z2ggdGhpcyBpcyBhIGNsYXNzLCBtZXRob2RzIGFyZSBzdGF0aWMgaW4gc3R5bGUgdG8gYWxsb3cgb3ZlcnJpZGUgdXNpbmcgc3ViY2xhc3Mgb3IganVzdCBmdW5jdGlvbnMuXG5jbGFzcyBIZWxwIHtcbiAgY29uc3RydWN0b3IoKSB7XG4gICAgdGhpcy5oZWxwV2lkdGggPSB1bmRlZmluZWQ7XG4gICAgdGhpcy5zb3J0U3ViY29tbWFuZHMgPSBmYWxzZTtcbiAgICB0aGlzLnNvcnRPcHRpb25zID0gZmFsc2U7XG4gICAgdGhpcy5zaG93R2xvYmFsT3B0aW9ucyA9IGZhbHNlO1xuICB9XG5cbiAgLyoqXG4gICAqIEdldCBhbiBhcnJheSBvZiB0aGUgdmlzaWJsZSBzdWJjb21tYW5kcy4gSW5jbHVkZXMgYSBwbGFjZWhvbGRlciBmb3IgdGhlIGltcGxpY2l0IGhlbHAgY29tbWFuZCwgaWYgdGhlcmUgaXMgb25lLlxuICAgKlxuICAgKiBAcGFyYW0ge0NvbW1hbmR9IGNtZFxuICAgKiBAcmV0dXJucyB7Q29tbWFuZFtdfVxuICAgKi9cblxuICB2aXNpYmxlQ29tbWFuZHMoY21kKSB7XG4gICAgY29uc3QgdmlzaWJsZUNvbW1hbmRzID0gY21kLmNvbW1hbmRzLmZpbHRlcigoY21kKSA9PiAhY21kLl9oaWRkZW4pO1xuICAgIGNvbnN0IGhlbHBDb21tYW5kID0gY21kLl9nZXRIZWxwQ29tbWFuZCgpO1xuICAgIGlmIChoZWxwQ29tbWFuZCAmJiAhaGVscENvbW1hbmQuX2hpZGRlbikge1xuICAgICAgdmlzaWJsZUNvbW1hbmRzLnB1c2goaGVscENvbW1hbmQpO1xuICAgIH1cbiAgICBpZiAodGhpcy5zb3J0U3ViY29tbWFuZHMpIHtcbiAgICAgIHZpc2libGVDb21tYW5kcy5zb3J0KChhLCBiKSA9PiB7XG4gICAgICAgIC8vIEB0cy1pZ25vcmU6IGJlY2F1c2Ugb3ZlcmxvYWRlZCByZXR1cm4gdHlwZVxuICAgICAgICByZXR1cm4gYS5uYW1lKCkubG9jYWxlQ29tcGFyZShiLm5hbWUoKSk7XG4gICAgICB9KTtcbiAgICB9XG4gICAgcmV0dXJuIHZpc2libGVDb21tYW5kcztcbiAgfVxuXG4gIC8qKlxuICAgKiBDb21wYXJlIG9wdGlvbnMgZm9yIHNvcnQuXG4gICAqXG4gICAqIEBwYXJhbSB7T3B0aW9ufSBhXG4gICAqIEBwYXJhbSB7T3B0aW9ufSBiXG4gICAqIEByZXR1cm5zIHtudW1iZXJ9XG4gICAqL1xuICBjb21wYXJlT3B0aW9ucyhhLCBiKSB7XG4gICAgY29uc3QgZ2V0U29ydEtleSA9IChvcHRpb24pID0+IHtcbiAgICAgIC8vIFdZU0lXWUcgZm9yIG9yZGVyIGRpc3BsYXllZCBpbiBoZWxwLiBTaG9ydCB1c2VkIGZvciBjb21wYXJpc29uIGlmIHByZXNlbnQuIE5vIHNwZWNpYWwgaGFuZGxpbmcgZm9yIG5lZ2F0ZWQuXG4gICAgICByZXR1cm4gb3B0aW9uLnNob3J0XG4gICAgICAgID8gb3B0aW9uLnNob3J0LnJlcGxhY2UoL14tLywgJycpXG4gICAgICAgIDogb3B0aW9uLmxvbmcucmVwbGFjZSgvXi0tLywgJycpO1xuICAgIH07XG4gICAgcmV0dXJuIGdldFNvcnRLZXkoYSkubG9jYWxlQ29tcGFyZShnZXRTb3J0S2V5KGIpKTtcbiAgfVxuXG4gIC8qKlxuICAgKiBHZXQgYW4gYXJyYXkgb2YgdGhlIHZpc2libGUgb3B0aW9ucy4gSW5jbHVkZXMgYSBwbGFjZWhvbGRlciBmb3IgdGhlIGltcGxpY2l0IGhlbHAgb3B0aW9uLCBpZiB0aGVyZSBpcyBvbmUuXG4gICAqXG4gICAqIEBwYXJhbSB7Q29tbWFuZH0gY21kXG4gICAqIEByZXR1cm5zIHtPcHRpb25bXX1cbiAgICovXG5cbiAgdmlzaWJsZU9wdGlvbnMoY21kKSB7XG4gICAgY29uc3QgdmlzaWJsZU9wdGlvbnMgPSBjbWQub3B0aW9ucy5maWx0ZXIoKG9wdGlvbikgPT4gIW9wdGlvbi5oaWRkZW4pO1xuICAgIC8vIEJ1aWx0LWluIGhlbHAgb3B0aW9uLlxuICAgIGNvbnN0IGhlbHBPcHRpb24gPSBjbWQuX2dldEhlbHBPcHRpb24oKTtcbiAgICBpZiAoaGVscE9wdGlvbiAmJiAhaGVscE9wdGlvbi5oaWRkZW4pIHtcbiAgICAgIC8vIEF1dG9tYXRpY2FsbHkgaGlkZSBjb25mbGljdGluZyBmbGFncy4gQml0IGR1YmlvdXMgYnV0IGEgaGlzdG9yaWNhbCBiZWhhdmlvdXIgdGhhdCBpcyBjb252ZW5pZW50IGZvciBzaW5nbGUtY29tbWFuZCBwcm9ncmFtcy5cbiAgICAgIGNvbnN0IHJlbW92ZVNob3J0ID0gaGVscE9wdGlvbi5zaG9ydCAmJiBjbWQuX2ZpbmRPcHRpb24oaGVscE9wdGlvbi5zaG9ydCk7XG4gICAgICBjb25zdCByZW1vdmVMb25nID0gaGVscE9wdGlvbi5sb25nICYmIGNtZC5fZmluZE9wdGlvbihoZWxwT3B0aW9uLmxvbmcpO1xuICAgICAgaWYgKCFyZW1vdmVTaG9ydCAmJiAhcmVtb3ZlTG9uZykge1xuICAgICAgICB2aXNpYmxlT3B0aW9ucy5wdXNoKGhlbHBPcHRpb24pOyAvLyBubyBjaGFuZ2VzIG5lZWRlZFxuICAgICAgfSBlbHNlIGlmIChoZWxwT3B0aW9uLmxvbmcgJiYgIXJlbW92ZUxvbmcpIHtcbiAgICAgICAgdmlzaWJsZU9wdGlvbnMucHVzaChcbiAgICAgICAgICBjbWQuY3JlYXRlT3B0aW9uKGhlbHBPcHRpb24ubG9uZywgaGVscE9wdGlvbi5kZXNjcmlwdGlvbiksXG4gICAgICAgICk7XG4gICAgICB9IGVsc2UgaWYgKGhlbHBPcHRpb24uc2hvcnQgJiYgIXJlbW92ZVNob3J0KSB7XG4gICAgICAgIHZpc2libGVPcHRpb25zLnB1c2goXG4gICAgICAgICAgY21kLmNyZWF0ZU9wdGlvbihoZWxwT3B0aW9uLnNob3J0LCBoZWxwT3B0aW9uLmRlc2NyaXB0aW9uKSxcbiAgICAgICAgKTtcbiAgICAgIH1cbiAgICB9XG4gICAgaWYgKHRoaXMuc29ydE9wdGlvbnMpIHtcbiAgICAgIHZpc2libGVPcHRpb25zLnNvcnQodGhpcy5jb21wYXJlT3B0aW9ucyk7XG4gICAgfVxuICAgIHJldHVybiB2aXNpYmxlT3B0aW9ucztcbiAgfVxuXG4gIC8qKlxuICAgKiBHZXQgYW4gYXJyYXkgb2YgdGhlIHZpc2libGUgZ2xvYmFsIG9wdGlvbnMuIChOb3QgaW5jbHVkaW5nIGhlbHAuKVxuICAgKlxuICAgKiBAcGFyYW0ge0NvbW1hbmR9IGNtZFxuICAgKiBAcmV0dXJucyB7T3B0aW9uW119XG4gICAqL1xuXG4gIHZpc2libGVHbG9iYWxPcHRpb25zKGNtZCkge1xuICAgIGlmICghdGhpcy5zaG93R2xvYmFsT3B0aW9ucykgcmV0dXJuIFtdO1xuXG4gICAgY29uc3QgZ2xvYmFsT3B0aW9ucyA9IFtdO1xuICAgIGZvciAoXG4gICAgICBsZXQgYW5jZXN0b3JDbWQgPSBjbWQucGFyZW50O1xuICAgICAgYW5jZXN0b3JDbWQ7XG4gICAgICBhbmNlc3RvckNtZCA9IGFuY2VzdG9yQ21kLnBhcmVudFxuICAgICkge1xuICAgICAgY29uc3QgdmlzaWJsZU9wdGlvbnMgPSBhbmNlc3RvckNtZC5vcHRpb25zLmZpbHRlcihcbiAgICAgICAgKG9wdGlvbikgPT4gIW9wdGlvbi5oaWRkZW4sXG4gICAgICApO1xuICAgICAgZ2xvYmFsT3B0aW9ucy5wdXNoKC4uLnZpc2libGVPcHRpb25zKTtcbiAgICB9XG4gICAgaWYgKHRoaXMuc29ydE9wdGlvbnMpIHtcbiAgICAgIGdsb2JhbE9wdGlvbnMuc29ydCh0aGlzLmNvbXBhcmVPcHRpb25zKTtcbiAgICB9XG4gICAgcmV0dXJuIGdsb2JhbE9wdGlvbnM7XG4gIH1cblxuICAvKipcbiAgICogR2V0IGFuIGFycmF5IG9mIHRoZSBhcmd1bWVudHMgaWYgYW55IGhhdmUgYSBkZXNjcmlwdGlvbi5cbiAgICpcbiAgICogQHBhcmFtIHtDb21tYW5kfSBjbWRcbiAgICogQHJldHVybnMge0FyZ3VtZW50W119XG4gICAqL1xuXG4gIHZpc2libGVBcmd1bWVudHMoY21kKSB7XG4gICAgLy8gU2lkZSBlZmZlY3QhIEFwcGx5IHRoZSBsZWdhY3kgZGVzY3JpcHRpb25zIGJlZm9yZSB0aGUgYXJndW1lbnRzIGFyZSBkaXNwbGF5ZWQuXG4gICAgaWYgKGNtZC5fYXJnc0Rlc2NyaXB0aW9uKSB7XG4gICAgICBjbWQucmVnaXN0ZXJlZEFyZ3VtZW50cy5mb3JFYWNoKChhcmd1bWVudCkgPT4ge1xuICAgICAgICBhcmd1bWVudC5kZXNjcmlwdGlvbiA9XG4gICAgICAgICAgYXJndW1lbnQuZGVzY3JpcHRpb24gfHwgY21kLl9hcmdzRGVzY3JpcHRpb25bYXJndW1lbnQubmFtZSgpXSB8fCAnJztcbiAgICAgIH0pO1xuICAgIH1cblxuICAgIC8vIElmIHRoZXJlIGFyZSBhbnkgYXJndW1lbnRzIHdpdGggYSBkZXNjcmlwdGlvbiB0aGVuIHJldHVybiBhbGwgdGhlIGFyZ3VtZW50cy5cbiAgICBpZiAoY21kLnJlZ2lzdGVyZWRBcmd1bWVudHMuZmluZCgoYXJndW1lbnQpID0+IGFyZ3VtZW50LmRlc2NyaXB0aW9uKSkge1xuICAgICAgcmV0dXJuIGNtZC5yZWdpc3RlcmVkQXJndW1lbnRzO1xuICAgIH1cbiAgICByZXR1cm4gW107XG4gIH1cblxuICAvKipcbiAgICogR2V0IHRoZSBjb21tYW5kIHRlcm0gdG8gc2hvdyBpbiB0aGUgbGlzdCBvZiBzdWJjb21tYW5kcy5cbiAgICpcbiAgICogQHBhcmFtIHtDb21tYW5kfSBjbWRcbiAgICogQHJldHVybnMge3N0cmluZ31cbiAgICovXG5cbiAgc3ViY29tbWFuZFRlcm0oY21kKSB7XG4gICAgLy8gTGVnYWN5LiBJZ25vcmVzIGN1c3RvbSB1c2FnZSBzdHJpbmcsIGFuZCBuZXN0ZWQgY29tbWFuZHMuXG4gICAgY29uc3QgYXJncyA9IGNtZC5yZWdpc3RlcmVkQXJndW1lbnRzXG4gICAgICAubWFwKChhcmcpID0+IGh1bWFuUmVhZGFibGVBcmdOYW1lKGFyZykpXG4gICAgICAuam9pbignICcpO1xuICAgIHJldHVybiAoXG4gICAgICBjbWQuX25hbWUgK1xuICAgICAgKGNtZC5fYWxpYXNlc1swXSA/ICd8JyArIGNtZC5fYWxpYXNlc1swXSA6ICcnKSArXG4gICAgICAoY21kLm9wdGlvbnMubGVuZ3RoID8gJyBbb3B0aW9uc10nIDogJycpICsgLy8gc2ltcGxpc3RpYyBjaGVjayBmb3Igbm9uLWhlbHAgb3B0aW9uXG4gICAgICAoYXJncyA/ICcgJyArIGFyZ3MgOiAnJylcbiAgICApO1xuICB9XG5cbiAgLyoqXG4gICAqIEdldCB0aGUgb3B0aW9uIHRlcm0gdG8gc2hvdyBpbiB0aGUgbGlzdCBvZiBvcHRpb25zLlxuICAgKlxuICAgKiBAcGFyYW0ge09wdGlvbn0gb3B0aW9uXG4gICAqIEByZXR1cm5zIHtzdHJpbmd9XG4gICAqL1xuXG4gIG9wdGlvblRlcm0ob3B0aW9uKSB7XG4gICAgcmV0dXJuIG9wdGlvbi5mbGFncztcbiAgfVxuXG4gIC8qKlxuICAgKiBHZXQgdGhlIGFyZ3VtZW50IHRlcm0gdG8gc2hvdyBpbiB0aGUgbGlzdCBvZiBhcmd1bWVudHMuXG4gICAqXG4gICAqIEBwYXJhbSB7QXJndW1lbnR9IGFyZ3VtZW50XG4gICAqIEByZXR1cm5zIHtzdHJpbmd9XG4gICAqL1xuXG4gIGFyZ3VtZW50VGVybShhcmd1bWVudCkge1xuICAgIHJldHVybiBhcmd1bWVudC5uYW1lKCk7XG4gIH1cblxuICAvKipcbiAgICogR2V0IHRoZSBsb25nZXN0IGNvbW1hbmQgdGVybSBsZW5ndGguXG4gICAqXG4gICAqIEBwYXJhbSB7Q29tbWFuZH0gY21kXG4gICAqIEBwYXJhbSB7SGVscH0gaGVscGVyXG4gICAqIEByZXR1cm5zIHtudW1iZXJ9XG4gICAqL1xuXG4gIGxvbmdlc3RTdWJjb21tYW5kVGVybUxlbmd0aChjbWQsIGhlbHBlcikge1xuICAgIHJldHVybiBoZWxwZXIudmlzaWJsZUNvbW1hbmRzKGNtZCkucmVkdWNlKChtYXgsIGNvbW1hbmQpID0+IHtcbiAgICAgIHJldHVybiBNYXRoLm1heChtYXgsIGhlbHBlci5zdWJjb21tYW5kVGVybShjb21tYW5kKS5sZW5ndGgpO1xuICAgIH0sIDApO1xuICB9XG5cbiAgLyoqXG4gICAqIEdldCB0aGUgbG9uZ2VzdCBvcHRpb24gdGVybSBsZW5ndGguXG4gICAqXG4gICAqIEBwYXJhbSB7Q29tbWFuZH0gY21kXG4gICAqIEBwYXJhbSB7SGVscH0gaGVscGVyXG4gICAqIEByZXR1cm5zIHtudW1iZXJ9XG4gICAqL1xuXG4gIGxvbmdlc3RPcHRpb25UZXJtTGVuZ3RoKGNtZCwgaGVscGVyKSB7XG4gICAgcmV0dXJuIGhlbHBlci52aXNpYmxlT3B0aW9ucyhjbWQpLnJlZHVjZSgobWF4LCBvcHRpb24pID0+IHtcbiAgICAgIHJldHVybiBNYXRoLm1heChtYXgsIGhlbHBlci5vcHRpb25UZXJtKG9wdGlvbikubGVuZ3RoKTtcbiAgICB9LCAwKTtcbiAgfVxuXG4gIC8qKlxuICAgKiBHZXQgdGhlIGxvbmdlc3QgZ2xvYmFsIG9wdGlvbiB0ZXJtIGxlbmd0aC5cbiAgICpcbiAgICogQHBhcmFtIHtDb21tYW5kfSBjbWRcbiAgICogQHBhcmFtIHtIZWxwfSBoZWxwZXJcbiAgICogQHJldHVybnMge251bWJlcn1cbiAgICovXG5cbiAgbG9uZ2VzdEdsb2JhbE9wdGlvblRlcm1MZW5ndGgoY21kLCBoZWxwZXIpIHtcbiAgICByZXR1cm4gaGVscGVyLnZpc2libGVHbG9iYWxPcHRpb25zKGNtZCkucmVkdWNlKChtYXgsIG9wdGlvbikgPT4ge1xuICAgICAgcmV0dXJuIE1hdGgubWF4KG1heCwgaGVscGVyLm9wdGlvblRlcm0ob3B0aW9uKS5sZW5ndGgpO1xuICAgIH0sIDApO1xuICB9XG5cbiAgLyoqXG4gICAqIEdldCB0aGUgbG9uZ2VzdCBhcmd1bWVudCB0ZXJtIGxlbmd0aC5cbiAgICpcbiAgICogQHBhcmFtIHtDb21tYW5kfSBjbWRcbiAgICogQHBhcmFtIHtIZWxwfSBoZWxwZXJcbiAgICogQHJldHVybnMge251bWJlcn1cbiAgICovXG5cbiAgbG9uZ2VzdEFyZ3VtZW50VGVybUxlbmd0aChjbWQsIGhlbHBlcikge1xuICAgIHJldHVybiBoZWxwZXIudmlzaWJsZUFyZ3VtZW50cyhjbWQpLnJlZHVjZSgobWF4LCBhcmd1bWVudCkgPT4ge1xuICAgICAgcmV0dXJuIE1hdGgubWF4KG1heCwgaGVscGVyLmFyZ3VtZW50VGVybShhcmd1bWVudCkubGVuZ3RoKTtcbiAgICB9LCAwKTtcbiAgfVxuXG4gIC8qKlxuICAgKiBHZXQgdGhlIGNvbW1hbmQgdXNhZ2UgdG8gYmUgZGlzcGxheWVkIGF0IHRoZSB0b3Agb2YgdGhlIGJ1aWx0LWluIGhlbHAuXG4gICAqXG4gICAqIEBwYXJhbSB7Q29tbWFuZH0gY21kXG4gICAqIEByZXR1cm5zIHtzdHJpbmd9XG4gICAqL1xuXG4gIGNvbW1hbmRVc2FnZShjbWQpIHtcbiAgICAvLyBVc2FnZVxuICAgIGxldCBjbWROYW1lID0gY21kLl9uYW1lO1xuICAgIGlmIChjbWQuX2FsaWFzZXNbMF0pIHtcbiAgICAgIGNtZE5hbWUgPSBjbWROYW1lICsgJ3wnICsgY21kLl9hbGlhc2VzWzBdO1xuICAgIH1cbiAgICBsZXQgYW5jZXN0b3JDbWROYW1lcyA9ICcnO1xuICAgIGZvciAoXG4gICAgICBsZXQgYW5jZXN0b3JDbWQgPSBjbWQucGFyZW50O1xuICAgICAgYW5jZXN0b3JDbWQ7XG4gICAgICBhbmNlc3RvckNtZCA9IGFuY2VzdG9yQ21kLnBhcmVudFxuICAgICkge1xuICAgICAgYW5jZXN0b3JDbWROYW1lcyA9IGFuY2VzdG9yQ21kLm5hbWUoKSArICcgJyArIGFuY2VzdG9yQ21kTmFtZXM7XG4gICAgfVxuICAgIHJldHVybiBhbmNlc3RvckNtZE5hbWVzICsgY21kTmFtZSArICcgJyArIGNtZC51c2FnZSgpO1xuICB9XG5cbiAgLyoqXG4gICAqIEdldCB0aGUgZGVzY3JpcHRpb24gZm9yIHRoZSBjb21tYW5kLlxuICAgKlxuICAgKiBAcGFyYW0ge0NvbW1hbmR9IGNtZFxuICAgKiBAcmV0dXJucyB7c3RyaW5nfVxuICAgKi9cblxuICBjb21tYW5kRGVzY3JpcHRpb24oY21kKSB7XG4gICAgLy8gQHRzLWlnbm9yZTogYmVjYXVzZSBvdmVybG9hZGVkIHJldHVybiB0eXBlXG4gICAgcmV0dXJuIGNtZC5kZXNjcmlwdGlvbigpO1xuICB9XG5cbiAgLyoqXG4gICAqIEdldCB0aGUgc3ViY29tbWFuZCBzdW1tYXJ5IHRvIHNob3cgaW4gdGhlIGxpc3Qgb2Ygc3ViY29tbWFuZHMuXG4gICAqIChGYWxsYmFjayB0byBkZXNjcmlwdGlvbiBmb3IgYmFja3dhcmRzIGNvbXBhdGliaWxpdHkuKVxuICAgKlxuICAgKiBAcGFyYW0ge0NvbW1hbmR9IGNtZFxuICAgKiBAcmV0dXJucyB7c3RyaW5nfVxuICAgKi9cblxuICBzdWJjb21tYW5kRGVzY3JpcHRpb24oY21kKSB7XG4gICAgLy8gQHRzLWlnbm9yZTogYmVjYXVzZSBvdmVybG9hZGVkIHJldHVybiB0eXBlXG4gICAgcmV0dXJuIGNtZC5zdW1tYXJ5KCkgfHwgY21kLmRlc2NyaXB0aW9uKCk7XG4gIH1cblxuICAvKipcbiAgICogR2V0IHRoZSBvcHRpb24gZGVzY3JpcHRpb24gdG8gc2hvdyBpbiB0aGUgbGlzdCBvZiBvcHRpb25zLlxuICAgKlxuICAgKiBAcGFyYW0ge09wdGlvbn0gb3B0aW9uXG4gICAqIEByZXR1cm4ge3N0cmluZ31cbiAgICovXG5cbiAgb3B0aW9uRGVzY3JpcHRpb24ob3B0aW9uKSB7XG4gICAgY29uc3QgZXh0cmFJbmZvID0gW107XG5cbiAgICBpZiAob3B0aW9uLmFyZ0Nob2ljZXMpIHtcbiAgICAgIGV4dHJhSW5mby5wdXNoKFxuICAgICAgICAvLyB1c2Ugc3RyaW5naWZ5IHRvIG1hdGNoIHRoZSBkaXNwbGF5IG9mIHRoZSBkZWZhdWx0IHZhbHVlXG4gICAgICAgIGBjaG9pY2VzOiAke29wdGlvbi5hcmdDaG9pY2VzLm1hcCgoY2hvaWNlKSA9PiBKU09OLnN0cmluZ2lmeShjaG9pY2UpKS5qb2luKCcsICcpfWAsXG4gICAgICApO1xuICAgIH1cbiAgICBpZiAob3B0aW9uLmRlZmF1bHRWYWx1ZSAhPT0gdW5kZWZpbmVkKSB7XG4gICAgICAvLyBkZWZhdWx0IGZvciBib29sZWFuIGFuZCBuZWdhdGVkIG1vcmUgZm9yIHByb2dyYW1tZXIgdGhhbiBlbmQgdXNlcixcbiAgICAgIC8vIGJ1dCBzaG93IHRydWUvZmFsc2UgZm9yIGJvb2xlYW4gb3B0aW9uIGFzIG1heSBiZSBmb3IgaGFuZC1yb2xsZWQgZW52IG9yIGNvbmZpZyBwcm9jZXNzaW5nLlxuICAgICAgY29uc3Qgc2hvd0RlZmF1bHQgPVxuICAgICAgICBvcHRpb24ucmVxdWlyZWQgfHxcbiAgICAgICAgb3B0aW9uLm9wdGlvbmFsIHx8XG4gICAgICAgIChvcHRpb24uaXNCb29sZWFuKCkgJiYgdHlwZW9mIG9wdGlvbi5kZWZhdWx0VmFsdWUgPT09ICdib29sZWFuJyk7XG4gICAgICBpZiAoc2hvd0RlZmF1bHQpIHtcbiAgICAgICAgZXh0cmFJbmZvLnB1c2goXG4gICAgICAgICAgYGRlZmF1bHQ6ICR7b3B0aW9uLmRlZmF1bHRWYWx1ZURlc2NyaXB0aW9uIHx8IEpTT04uc3RyaW5naWZ5KG9wdGlvbi5kZWZhdWx0VmFsdWUpfWAsXG4gICAgICAgICk7XG4gICAgICB9XG4gICAgfVxuICAgIC8vIHByZXNldCBmb3IgYm9vbGVhbiBhbmQgbmVnYXRlZCBhcmUgbW9yZSBmb3IgcHJvZ3JhbW1lciB0aGFuIGVuZCB1c2VyXG4gICAgaWYgKG9wdGlvbi5wcmVzZXRBcmcgIT09IHVuZGVmaW5lZCAmJiBvcHRpb24ub3B0aW9uYWwpIHtcbiAgICAgIGV4dHJhSW5mby5wdXNoKGBwcmVzZXQ6ICR7SlNPTi5zdHJpbmdpZnkob3B0aW9uLnByZXNldEFyZyl9YCk7XG4gICAgfVxuICAgIGlmIChvcHRpb24uZW52VmFyICE9PSB1bmRlZmluZWQpIHtcbiAgICAgIGV4dHJhSW5mby5wdXNoKGBlbnY6ICR7b3B0aW9uLmVudlZhcn1gKTtcbiAgICB9XG4gICAgaWYgKGV4dHJhSW5mby5sZW5ndGggPiAwKSB7XG4gICAgICByZXR1cm4gYCR7b3B0aW9uLmRlc2NyaXB0aW9ufSAoJHtleHRyYUluZm8uam9pbignLCAnKX0pYDtcbiAgICB9XG5cbiAgICByZXR1cm4gb3B0aW9uLmRlc2NyaXB0aW9uO1xuICB9XG5cbiAgLyoqXG4gICAqIEdldCB0aGUgYXJndW1lbnQgZGVzY3JpcHRpb24gdG8gc2hvdyBpbiB0aGUgbGlzdCBvZiBhcmd1bWVudHMuXG4gICAqXG4gICAqIEBwYXJhbSB7QXJndW1lbnR9IGFyZ3VtZW50XG4gICAqIEByZXR1cm4ge3N0cmluZ31cbiAgICovXG5cbiAgYXJndW1lbnREZXNjcmlwdGlvbihhcmd1bWVudCkge1xuICAgIGNvbnN0IGV4dHJhSW5mbyA9IFtdO1xuICAgIGlmIChhcmd1bWVudC5hcmdDaG9pY2VzKSB7XG4gICAgICBleHRyYUluZm8ucHVzaChcbiAgICAgICAgLy8gdXNlIHN0cmluZ2lmeSB0byBtYXRjaCB0aGUgZGlzcGxheSBvZiB0aGUgZGVmYXVsdCB2YWx1ZVxuICAgICAgICBgY2hvaWNlczogJHthcmd1bWVudC5hcmdDaG9pY2VzLm1hcCgoY2hvaWNlKSA9PiBKU09OLnN0cmluZ2lmeShjaG9pY2UpKS5qb2luKCcsICcpfWAsXG4gICAgICApO1xuICAgIH1cbiAgICBpZiAoYXJndW1lbnQuZGVmYXVsdFZhbHVlICE9PSB1bmRlZmluZWQpIHtcbiAgICAgIGV4dHJhSW5mby5wdXNoKFxuICAgICAgICBgZGVmYXVsdDogJHthcmd1bWVudC5kZWZhdWx0VmFsdWVEZXNjcmlwdGlvbiB8fCBKU09OLnN0cmluZ2lmeShhcmd1bWVudC5kZWZhdWx0VmFsdWUpfWAsXG4gICAgICApO1xuICAgIH1cbiAgICBpZiAoZXh0cmFJbmZvLmxlbmd0aCA+IDApIHtcbiAgICAgIGNvbnN0IGV4dHJhRGVzY3JpcHRvbiA9IGAoJHtleHRyYUluZm8uam9pbignLCAnKX0pYDtcbiAgICAgIGlmIChhcmd1bWVudC5kZXNjcmlwdGlvbikge1xuICAgICAgICByZXR1cm4gYCR7YXJndW1lbnQuZGVzY3JpcHRpb259ICR7ZXh0cmFEZXNjcmlwdG9ufWA7XG4gICAgICB9XG4gICAgICByZXR1cm4gZXh0cmFEZXNjcmlwdG9uO1xuICAgIH1cbiAgICByZXR1cm4gYXJndW1lbnQuZGVzY3JpcHRpb247XG4gIH1cblxuICAvKipcbiAgICogR2VuZXJhdGUgdGhlIGJ1aWx0LWluIGhlbHAgdGV4dC5cbiAgICpcbiAgICogQHBhcmFtIHtDb21tYW5kfSBjbWRcbiAgICogQHBhcmFtIHtIZWxwfSBoZWxwZXJcbiAgICogQHJldHVybnMge3N0cmluZ31cbiAgICovXG5cbiAgZm9ybWF0SGVscChjbWQsIGhlbHBlcikge1xuICAgIGNvbnN0IHRlcm1XaWR0aCA9IGhlbHBlci5wYWRXaWR0aChjbWQsIGhlbHBlcik7XG4gICAgY29uc3QgaGVscFdpZHRoID0gaGVscGVyLmhlbHBXaWR0aCB8fCA4MDtcbiAgICBjb25zdCBpdGVtSW5kZW50V2lkdGggPSAyO1xuICAgIGNvbnN0IGl0ZW1TZXBhcmF0b3JXaWR0aCA9IDI7IC8vIGJldHdlZW4gdGVybSBhbmQgZGVzY3JpcHRpb25cbiAgICBmdW5jdGlvbiBmb3JtYXRJdGVtKHRlcm0sIGRlc2NyaXB0aW9uKSB7XG4gICAgICBpZiAoZGVzY3JpcHRpb24pIHtcbiAgICAgICAgY29uc3QgZnVsbFRleHQgPSBgJHt0ZXJtLnBhZEVuZCh0ZXJtV2lkdGggKyBpdGVtU2VwYXJhdG9yV2lkdGgpfSR7ZGVzY3JpcHRpb259YDtcbiAgICAgICAgcmV0dXJuIGhlbHBlci53cmFwKFxuICAgICAgICAgIGZ1bGxUZXh0LFxuICAgICAgICAgIGhlbHBXaWR0aCAtIGl0ZW1JbmRlbnRXaWR0aCxcbiAgICAgICAgICB0ZXJtV2lkdGggKyBpdGVtU2VwYXJhdG9yV2lkdGgsXG4gICAgICAgICk7XG4gICAgICB9XG4gICAgICByZXR1cm4gdGVybTtcbiAgICB9XG4gICAgZnVuY3Rpb24gZm9ybWF0TGlzdCh0ZXh0QXJyYXkpIHtcbiAgICAgIHJldHVybiB0ZXh0QXJyYXkuam9pbignXFxuJykucmVwbGFjZSgvXi9nbSwgJyAnLnJlcGVhdChpdGVtSW5kZW50V2lkdGgpKTtcbiAgICB9XG5cbiAgICAvLyBVc2FnZVxuICAgIGxldCBvdXRwdXQgPSBbYFVzYWdlOiAke2hlbHBlci5jb21tYW5kVXNhZ2UoY21kKX1gLCAnJ107XG5cbiAgICAvLyBEZXNjcmlwdGlvblxuICAgIGNvbnN0IGNvbW1hbmREZXNjcmlwdGlvbiA9IGhlbHBlci5jb21tYW5kRGVzY3JpcHRpb24oY21kKTtcbiAgICBpZiAoY29tbWFuZERlc2NyaXB0aW9uLmxlbmd0aCA+IDApIHtcbiAgICAgIG91dHB1dCA9IG91dHB1dC5jb25jYXQoW1xuICAgICAgICBoZWxwZXIud3JhcChjb21tYW5kRGVzY3JpcHRpb24sIGhlbHBXaWR0aCwgMCksXG4gICAgICAgICcnLFxuICAgICAgXSk7XG4gICAgfVxuXG4gICAgLy8gQXJndW1lbnRzXG4gICAgY29uc3QgYXJndW1lbnRMaXN0ID0gaGVscGVyLnZpc2libGVBcmd1bWVudHMoY21kKS5tYXAoKGFyZ3VtZW50KSA9PiB7XG4gICAgICByZXR1cm4gZm9ybWF0SXRlbShcbiAgICAgICAgaGVscGVyLmFyZ3VtZW50VGVybShhcmd1bWVudCksXG4gICAgICAgIGhlbHBlci5hcmd1bWVudERlc2NyaXB0aW9uKGFyZ3VtZW50KSxcbiAgICAgICk7XG4gICAgfSk7XG4gICAgaWYgKGFyZ3VtZW50TGlzdC5sZW5ndGggPiAwKSB7XG4gICAgICBvdXRwdXQgPSBvdXRwdXQuY29uY2F0KFsnQXJndW1lbnRzOicsIGZvcm1hdExpc3QoYXJndW1lbnRMaXN0KSwgJyddKTtcbiAgICB9XG5cbiAgICAvLyBPcHRpb25zXG4gICAgY29uc3Qgb3B0aW9uTGlzdCA9IGhlbHBlci52aXNpYmxlT3B0aW9ucyhjbWQpLm1hcCgob3B0aW9uKSA9PiB7XG4gICAgICByZXR1cm4gZm9ybWF0SXRlbShcbiAgICAgICAgaGVscGVyLm9wdGlvblRlcm0ob3B0aW9uKSxcbiAgICAgICAgaGVscGVyLm9wdGlvbkRlc2NyaXB0aW9uKG9wdGlvbiksXG4gICAgICApO1xuICAgIH0pO1xuICAgIGlmIChvcHRpb25MaXN0Lmxlbmd0aCA+IDApIHtcbiAgICAgIG91dHB1dCA9IG91dHB1dC5jb25jYXQoWydPcHRpb25zOicsIGZvcm1hdExpc3Qob3B0aW9uTGlzdCksICcnXSk7XG4gICAgfVxuXG4gICAgaWYgKHRoaXMuc2hvd0dsb2JhbE9wdGlvbnMpIHtcbiAgICAgIGNvbnN0IGdsb2JhbE9wdGlvbkxpc3QgPSBoZWxwZXJcbiAgICAgICAgLnZpc2libGVHbG9iYWxPcHRpb25zKGNtZClcbiAgICAgICAgLm1hcCgob3B0aW9uKSA9PiB7XG4gICAgICAgICAgcmV0dXJuIGZvcm1hdEl0ZW0oXG4gICAgICAgICAgICBoZWxwZXIub3B0aW9uVGVybShvcHRpb24pLFxuICAgICAgICAgICAgaGVscGVyLm9wdGlvbkRlc2NyaXB0aW9uKG9wdGlvbiksXG4gICAgICAgICAgKTtcbiAgICAgICAgfSk7XG4gICAgICBpZiAoZ2xvYmFsT3B0aW9uTGlzdC5sZW5ndGggPiAwKSB7XG4gICAgICAgIG91dHB1dCA9IG91dHB1dC5jb25jYXQoW1xuICAgICAgICAgICdHbG9iYWwgT3B0aW9uczonLFxuICAgICAgICAgIGZvcm1hdExpc3QoZ2xvYmFsT3B0aW9uTGlzdCksXG4gICAgICAgICAgJycsXG4gICAgICAgIF0pO1xuICAgICAgfVxuICAgIH1cblxuICAgIC8vIENvbW1hbmRzXG4gICAgY29uc3QgY29tbWFuZExpc3QgPSBoZWxwZXIudmlzaWJsZUNvbW1hbmRzKGNtZCkubWFwKChjbWQpID0+IHtcbiAgICAgIHJldHVybiBmb3JtYXRJdGVtKFxuICAgICAgICBoZWxwZXIuc3ViY29tbWFuZFRlcm0oY21kKSxcbiAgICAgICAgaGVscGVyLnN1YmNvbW1hbmREZXNjcmlwdGlvbihjbWQpLFxuICAgICAgKTtcbiAgICB9KTtcbiAgICBpZiAoY29tbWFuZExpc3QubGVuZ3RoID4gMCkge1xuICAgICAgb3V0cHV0ID0gb3V0cHV0LmNvbmNhdChbJ0NvbW1hbmRzOicsIGZvcm1hdExpc3QoY29tbWFuZExpc3QpLCAnJ10pO1xuICAgIH1cblxuICAgIHJldHVybiBvdXRwdXQuam9pbignXFxuJyk7XG4gIH1cblxuICAvKipcbiAgICogQ2FsY3VsYXRlIHRoZSBwYWQgd2lkdGggZnJvbSB0aGUgbWF4aW11bSB0ZXJtIGxlbmd0aC5cbiAgICpcbiAgICogQHBhcmFtIHtDb21tYW5kfSBjbWRcbiAgICogQHBhcmFtIHtIZWxwfSBoZWxwZXJcbiAgICogQHJldHVybnMge251bWJlcn1cbiAgICovXG5cbiAgcGFkV2lkdGgoY21kLCBoZWxwZXIpIHtcbiAgICByZXR1cm4gTWF0aC5tYXgoXG4gICAgICBoZWxwZXIubG9uZ2VzdE9wdGlvblRlcm1MZW5ndGgoY21kLCBoZWxwZXIpLFxuICAgICAgaGVscGVyLmxvbmdlc3RHbG9iYWxPcHRpb25UZXJtTGVuZ3RoKGNtZCwgaGVscGVyKSxcbiAgICAgIGhlbHBlci5sb25nZXN0U3ViY29tbWFuZFRlcm1MZW5ndGgoY21kLCBoZWxwZXIpLFxuICAgICAgaGVscGVyLmxvbmdlc3RBcmd1bWVudFRlcm1MZW5ndGgoY21kLCBoZWxwZXIpLFxuICAgICk7XG4gIH1cblxuICAvKipcbiAgICogV3JhcCB0aGUgZ2l2ZW4gc3RyaW5nIHRvIHdpZHRoIGNoYXJhY3RlcnMgcGVyIGxpbmUsIHdpdGggbGluZXMgYWZ0ZXIgdGhlIGZpcnN0IGluZGVudGVkLlxuICAgKiBEbyBub3Qgd3JhcCBpZiBpbnN1ZmZpY2llbnQgcm9vbSBmb3Igd3JhcHBpbmcgKG1pbkNvbHVtbldpZHRoKSwgb3Igc3RyaW5nIGlzIG1hbnVhbGx5IGZvcm1hdHRlZC5cbiAgICpcbiAgICogQHBhcmFtIHtzdHJpbmd9IHN0clxuICAgKiBAcGFyYW0ge251bWJlcn0gd2lkdGhcbiAgICogQHBhcmFtIHtudW1iZXJ9IGluZGVudFxuICAgKiBAcGFyYW0ge251bWJlcn0gW21pbkNvbHVtbldpZHRoPTQwXVxuICAgKiBAcmV0dXJuIHtzdHJpbmd9XG4gICAqXG4gICAqL1xuXG4gIHdyYXAoc3RyLCB3aWR0aCwgaW5kZW50LCBtaW5Db2x1bW5XaWR0aCA9IDQwKSB7XG4gICAgLy8gRnVsbCBcXHMgY2hhcmFjdGVycywgbWludXMgdGhlIGxpbmVmZWVkcy5cbiAgICBjb25zdCBpbmRlbnRzID1cbiAgICAgICcgXFxcXGZcXFxcdFxcXFx2XFx1MDBhMFxcdTE2ODBcXHUyMDAwLVxcdTIwMGFcXHUyMDJmXFx1MjA1ZlxcdTMwMDBcXHVmZWZmJztcbiAgICAvLyBEZXRlY3QgbWFudWFsbHkgd3JhcHBlZCBhbmQgaW5kZW50ZWQgc3RyaW5ncyBieSBzZWFyY2hpbmcgZm9yIGxpbmUgYnJlYWsgZm9sbG93ZWQgYnkgc3BhY2VzLlxuICAgIGNvbnN0IG1hbnVhbEluZGVudCA9IG5ldyBSZWdFeHAoYFtcXFxcbl1bJHtpbmRlbnRzfV0rYCk7XG4gICAgaWYgKHN0ci5tYXRjaChtYW51YWxJbmRlbnQpKSByZXR1cm4gc3RyO1xuICAgIC8vIERvIG5vdCB3cmFwIGlmIG5vdCBlbm91Z2ggcm9vbSBmb3IgYSB3cmFwcGVkIGNvbHVtbiBvZiB0ZXh0IChhcyBjb3VsZCBlbmQgdXAgd2l0aCBhIHdvcmQgcGVyIGxpbmUpLlxuICAgIGNvbnN0IGNvbHVtbldpZHRoID0gd2lkdGggLSBpbmRlbnQ7XG4gICAgaWYgKGNvbHVtbldpZHRoIDwgbWluQ29sdW1uV2lkdGgpIHJldHVybiBzdHI7XG5cbiAgICBjb25zdCBsZWFkaW5nU3RyID0gc3RyLnNsaWNlKDAsIGluZGVudCk7XG4gICAgY29uc3QgY29sdW1uVGV4dCA9IHN0ci5zbGljZShpbmRlbnQpLnJlcGxhY2UoJ1xcclxcbicsICdcXG4nKTtcbiAgICBjb25zdCBpbmRlbnRTdHJpbmcgPSAnICcucmVwZWF0KGluZGVudCk7XG4gICAgY29uc3QgemVyb1dpZHRoU3BhY2UgPSAnXFx1MjAwQic7XG4gICAgY29uc3QgYnJlYWtzID0gYFxcXFxzJHt6ZXJvV2lkdGhTcGFjZX1gO1xuICAgIC8vIE1hdGNoIGxpbmUgZW5kIChzbyBlbXB0eSBsaW5lcyBkb24ndCBjb2xsYXBzZSksXG4gICAgLy8gb3IgYXMgbXVjaCB0ZXh0IGFzIHdpbGwgZml0IGluIGNvbHVtbiwgb3IgZXhjZXNzIHRleHQgdXAgdG8gZmlyc3QgYnJlYWsuXG4gICAgY29uc3QgcmVnZXggPSBuZXcgUmVnRXhwKFxuICAgICAgYFxcbnwuezEsJHtjb2x1bW5XaWR0aCAtIDF9fShbJHticmVha3N9XXwkKXxbXiR7YnJlYWtzfV0rPyhbJHticmVha3N9XXwkKWAsXG4gICAgICAnZycsXG4gICAgKTtcbiAgICBjb25zdCBsaW5lcyA9IGNvbHVtblRleHQubWF0Y2gocmVnZXgpIHx8IFtdO1xuICAgIHJldHVybiAoXG4gICAgICBsZWFkaW5nU3RyICtcbiAgICAgIGxpbmVzXG4gICAgICAgIC5tYXAoKGxpbmUsIGkpID0+IHtcbiAgICAgICAgICBpZiAobGluZSA9PT0gJ1xcbicpIHJldHVybiAnJzsgLy8gcHJlc2VydmUgZW1wdHkgbGluZXNcbiAgICAgICAgICByZXR1cm4gKGkgPiAwID8gaW5kZW50U3RyaW5nIDogJycpICsgbGluZS50cmltRW5kKCk7XG4gICAgICAgIH0pXG4gICAgICAgIC5qb2luKCdcXG4nKVxuICAgICk7XG4gIH1cbn1cblxuZXhwb3J0cy5IZWxwID0gSGVscDtcbiIsImNvbnN0IHsgSW52YWxpZEFyZ3VtZW50RXJyb3IgfSA9IHJlcXVpcmUoJy4vZXJyb3IuanMnKTtcblxuY2xhc3MgT3B0aW9uIHtcbiAgLyoqXG4gICAqIEluaXRpYWxpemUgYSBuZXcgYE9wdGlvbmAgd2l0aCB0aGUgZ2l2ZW4gYGZsYWdzYCBhbmQgYGRlc2NyaXB0aW9uYC5cbiAgICpcbiAgICogQHBhcmFtIHtzdHJpbmd9IGZsYWdzXG4gICAqIEBwYXJhbSB7c3RyaW5nfSBbZGVzY3JpcHRpb25dXG4gICAqL1xuXG4gIGNvbnN0cnVjdG9yKGZsYWdzLCBkZXNjcmlwdGlvbikge1xuICAgIHRoaXMuZmxhZ3MgPSBmbGFncztcbiAgICB0aGlzLmRlc2NyaXB0aW9uID0gZGVzY3JpcHRpb24gfHwgJyc7XG5cbiAgICB0aGlzLnJlcXVpcmVkID0gZmxhZ3MuaW5jbHVkZXMoJzwnKTsgLy8gQSB2YWx1ZSBtdXN0IGJlIHN1cHBsaWVkIHdoZW4gdGhlIG9wdGlvbiBpcyBzcGVjaWZpZWQuXG4gICAgdGhpcy5vcHRpb25hbCA9IGZsYWdzLmluY2x1ZGVzKCdbJyk7IC8vIEEgdmFsdWUgaXMgb3B0aW9uYWwgd2hlbiB0aGUgb3B0aW9uIGlzIHNwZWNpZmllZC5cbiAgICAvLyB2YXJpYWRpYyB0ZXN0IGlnbm9yZXMgPHZhbHVlLC4uLj4gZXQgYWwgd2hpY2ggbWlnaHQgYmUgdXNlZCB0byBkZXNjcmliZSBjdXN0b20gc3BsaXR0aW5nIG9mIHNpbmdsZSBhcmd1bWVudFxuICAgIHRoaXMudmFyaWFkaWMgPSAvXFx3XFwuXFwuXFwuWz5cXF1dJC8udGVzdChmbGFncyk7IC8vIFRoZSBvcHRpb24gY2FuIHRha2UgbXVsdGlwbGUgdmFsdWVzLlxuICAgIHRoaXMubWFuZGF0b3J5ID0gZmFsc2U7IC8vIFRoZSBvcHRpb24gbXVzdCBoYXZlIGEgdmFsdWUgYWZ0ZXIgcGFyc2luZywgd2hpY2ggdXN1YWxseSBtZWFucyBpdCBtdXN0IGJlIHNwZWNpZmllZCBvbiBjb21tYW5kIGxpbmUuXG4gICAgY29uc3Qgb3B0aW9uRmxhZ3MgPSBzcGxpdE9wdGlvbkZsYWdzKGZsYWdzKTtcbiAgICB0aGlzLnNob3J0ID0gb3B0aW9uRmxhZ3Muc2hvcnRGbGFnO1xuICAgIHRoaXMubG9uZyA9IG9wdGlvbkZsYWdzLmxvbmdGbGFnO1xuICAgIHRoaXMubmVnYXRlID0gZmFsc2U7XG4gICAgaWYgKHRoaXMubG9uZykge1xuICAgICAgdGhpcy5uZWdhdGUgPSB0aGlzLmxvbmcuc3RhcnRzV2l0aCgnLS1uby0nKTtcbiAgICB9XG4gICAgdGhpcy5kZWZhdWx0VmFsdWUgPSB1bmRlZmluZWQ7XG4gICAgdGhpcy5kZWZhdWx0VmFsdWVEZXNjcmlwdGlvbiA9IHVuZGVmaW5lZDtcbiAgICB0aGlzLnByZXNldEFyZyA9IHVuZGVmaW5lZDtcbiAgICB0aGlzLmVudlZhciA9IHVuZGVmaW5lZDtcbiAgICB0aGlzLnBhcnNlQXJnID0gdW5kZWZpbmVkO1xuICAgIHRoaXMuaGlkZGVuID0gZmFsc2U7XG4gICAgdGhpcy5hcmdDaG9pY2VzID0gdW5kZWZpbmVkO1xuICAgIHRoaXMuY29uZmxpY3RzV2l0aCA9IFtdO1xuICAgIHRoaXMuaW1wbGllZCA9IHVuZGVmaW5lZDtcbiAgfVxuXG4gIC8qKlxuICAgKiBTZXQgdGhlIGRlZmF1bHQgdmFsdWUsIGFuZCBvcHRpb25hbGx5IHN1cHBseSB0aGUgZGVzY3JpcHRpb24gdG8gYmUgZGlzcGxheWVkIGluIHRoZSBoZWxwLlxuICAgKlxuICAgKiBAcGFyYW0geyp9IHZhbHVlXG4gICAqIEBwYXJhbSB7c3RyaW5nfSBbZGVzY3JpcHRpb25dXG4gICAqIEByZXR1cm4ge09wdGlvbn1cbiAgICovXG5cbiAgZGVmYXVsdCh2YWx1ZSwgZGVzY3JpcHRpb24pIHtcbiAgICB0aGlzLmRlZmF1bHRWYWx1ZSA9IHZhbHVlO1xuICAgIHRoaXMuZGVmYXVsdFZhbHVlRGVzY3JpcHRpb24gPSBkZXNjcmlwdGlvbjtcbiAgICByZXR1cm4gdGhpcztcbiAgfVxuXG4gIC8qKlxuICAgKiBQcmVzZXQgdG8gdXNlIHdoZW4gb3B0aW9uIHVzZWQgd2l0aG91dCBvcHRpb24tYXJndW1lbnQsIGVzcGVjaWFsbHkgb3B0aW9uYWwgYnV0IGFsc28gYm9vbGVhbiBhbmQgbmVnYXRlZC5cbiAgICogVGhlIGN1c3RvbSBwcm9jZXNzaW5nIChwYXJzZUFyZykgaXMgY2FsbGVkLlxuICAgKlxuICAgKiBAZXhhbXBsZVxuICAgKiBuZXcgT3B0aW9uKCctLWNvbG9yJykuZGVmYXVsdCgnR1JFWVNDQUxFJykucHJlc2V0KCdSR0InKTtcbiAgICogbmV3IE9wdGlvbignLS1kb25hdGUgW2Ftb3VudF0nKS5wcmVzZXQoJzIwJykuYXJnUGFyc2VyKHBhcnNlRmxvYXQpO1xuICAgKlxuICAgKiBAcGFyYW0geyp9IGFyZ1xuICAgKiBAcmV0dXJuIHtPcHRpb259XG4gICAqL1xuXG4gIHByZXNldChhcmcpIHtcbiAgICB0aGlzLnByZXNldEFyZyA9IGFyZztcbiAgICByZXR1cm4gdGhpcztcbiAgfVxuXG4gIC8qKlxuICAgKiBBZGQgb3B0aW9uIG5hbWUocykgdGhhdCBjb25mbGljdCB3aXRoIHRoaXMgb3B0aW9uLlxuICAgKiBBbiBlcnJvciB3aWxsIGJlIGRpc3BsYXllZCBpZiBjb25mbGljdGluZyBvcHRpb25zIGFyZSBmb3VuZCBkdXJpbmcgcGFyc2luZy5cbiAgICpcbiAgICogQGV4YW1wbGVcbiAgICogbmV3IE9wdGlvbignLS1yZ2InKS5jb25mbGljdHMoJ2NteWsnKTtcbiAgICogbmV3IE9wdGlvbignLS1qcycpLmNvbmZsaWN0cyhbJ3RzJywgJ2pzeCddKTtcbiAgICpcbiAgICogQHBhcmFtIHsoc3RyaW5nIHwgc3RyaW5nW10pfSBuYW1lc1xuICAgKiBAcmV0dXJuIHtPcHRpb259XG4gICAqL1xuXG4gIGNvbmZsaWN0cyhuYW1lcykge1xuICAgIHRoaXMuY29uZmxpY3RzV2l0aCA9IHRoaXMuY29uZmxpY3RzV2l0aC5jb25jYXQobmFtZXMpO1xuICAgIHJldHVybiB0aGlzO1xuICB9XG5cbiAgLyoqXG4gICAqIFNwZWNpZnkgaW1wbGllZCBvcHRpb24gdmFsdWVzIGZvciB3aGVuIHRoaXMgb3B0aW9uIGlzIHNldCBhbmQgdGhlIGltcGxpZWQgb3B0aW9ucyBhcmUgbm90LlxuICAgKlxuICAgKiBUaGUgY3VzdG9tIHByb2Nlc3NpbmcgKHBhcnNlQXJnKSBpcyBub3QgY2FsbGVkIG9uIHRoZSBpbXBsaWVkIHZhbHVlcy5cbiAgICpcbiAgICogQGV4YW1wbGVcbiAgICogcHJvZ3JhbVxuICAgKiAgIC5hZGRPcHRpb24obmV3IE9wdGlvbignLS1sb2cnLCAnd3JpdGUgbG9nZ2luZyBpbmZvcm1hdGlvbiB0byBmaWxlJykpXG4gICAqICAgLmFkZE9wdGlvbihuZXcgT3B0aW9uKCctLXRyYWNlJywgJ2xvZyBleHRyYSBkZXRhaWxzJykuaW1wbGllcyh7IGxvZzogJ3RyYWNlLnR4dCcgfSkpO1xuICAgKlxuICAgKiBAcGFyYW0ge29iamVjdH0gaW1wbGllZE9wdGlvblZhbHVlc1xuICAgKiBAcmV0dXJuIHtPcHRpb259XG4gICAqL1xuICBpbXBsaWVzKGltcGxpZWRPcHRpb25WYWx1ZXMpIHtcbiAgICBsZXQgbmV3SW1wbGllZCA9IGltcGxpZWRPcHRpb25WYWx1ZXM7XG4gICAgaWYgKHR5cGVvZiBpbXBsaWVkT3B0aW9uVmFsdWVzID09PSAnc3RyaW5nJykge1xuICAgICAgLy8gc3RyaW5nIGlzIG5vdCBkb2N1bWVudGVkLCBidXQgZWFzeSBtaXN0YWtlIGFuZCB3ZSBjYW4gZG8gd2hhdCB1c2VyIHByb2JhYmx5IGludGVuZGVkLlxuICAgICAgbmV3SW1wbGllZCA9IHsgW2ltcGxpZWRPcHRpb25WYWx1ZXNdOiB0cnVlIH07XG4gICAgfVxuICAgIHRoaXMuaW1wbGllZCA9IE9iamVjdC5hc3NpZ24odGhpcy5pbXBsaWVkIHx8IHt9LCBuZXdJbXBsaWVkKTtcbiAgICByZXR1cm4gdGhpcztcbiAgfVxuXG4gIC8qKlxuICAgKiBTZXQgZW52aXJvbm1lbnQgdmFyaWFibGUgdG8gY2hlY2sgZm9yIG9wdGlvbiB2YWx1ZS5cbiAgICpcbiAgICogQW4gZW52aXJvbm1lbnQgdmFyaWFibGUgaXMgb25seSB1c2VkIGlmIHdoZW4gcHJvY2Vzc2VkIHRoZSBjdXJyZW50IG9wdGlvbiB2YWx1ZSBpc1xuICAgKiB1bmRlZmluZWQsIG9yIHRoZSBzb3VyY2Ugb2YgdGhlIGN1cnJlbnQgdmFsdWUgaXMgJ2RlZmF1bHQnIG9yICdjb25maWcnIG9yICdlbnYnLlxuICAgKlxuICAgKiBAcGFyYW0ge3N0cmluZ30gbmFtZVxuICAgKiBAcmV0dXJuIHtPcHRpb259XG4gICAqL1xuXG4gIGVudihuYW1lKSB7XG4gICAgdGhpcy5lbnZWYXIgPSBuYW1lO1xuICAgIHJldHVybiB0aGlzO1xuICB9XG5cbiAgLyoqXG4gICAqIFNldCB0aGUgY3VzdG9tIGhhbmRsZXIgZm9yIHByb2Nlc3NpbmcgQ0xJIG9wdGlvbiBhcmd1bWVudHMgaW50byBvcHRpb24gdmFsdWVzLlxuICAgKlxuICAgKiBAcGFyYW0ge0Z1bmN0aW9ufSBbZm5dXG4gICAqIEByZXR1cm4ge09wdGlvbn1cbiAgICovXG5cbiAgYXJnUGFyc2VyKGZuKSB7XG4gICAgdGhpcy5wYXJzZUFyZyA9IGZuO1xuICAgIHJldHVybiB0aGlzO1xuICB9XG5cbiAgLyoqXG4gICAqIFdoZXRoZXIgdGhlIG9wdGlvbiBpcyBtYW5kYXRvcnkgYW5kIG11c3QgaGF2ZSBhIHZhbHVlIGFmdGVyIHBhcnNpbmcuXG4gICAqXG4gICAqIEBwYXJhbSB7Ym9vbGVhbn0gW21hbmRhdG9yeT10cnVlXVxuICAgKiBAcmV0dXJuIHtPcHRpb259XG4gICAqL1xuXG4gIG1ha2VPcHRpb25NYW5kYXRvcnkobWFuZGF0b3J5ID0gdHJ1ZSkge1xuICAgIHRoaXMubWFuZGF0b3J5ID0gISFtYW5kYXRvcnk7XG4gICAgcmV0dXJuIHRoaXM7XG4gIH1cblxuICAvKipcbiAgICogSGlkZSBvcHRpb24gaW4gaGVscC5cbiAgICpcbiAgICogQHBhcmFtIHtib29sZWFufSBbaGlkZT10cnVlXVxuICAgKiBAcmV0dXJuIHtPcHRpb259XG4gICAqL1xuXG4gIGhpZGVIZWxwKGhpZGUgPSB0cnVlKSB7XG4gICAgdGhpcy5oaWRkZW4gPSAhIWhpZGU7XG4gICAgcmV0dXJuIHRoaXM7XG4gIH1cblxuICAvKipcbiAgICogQHBhY2thZ2VcbiAgICovXG5cbiAgX2NvbmNhdFZhbHVlKHZhbHVlLCBwcmV2aW91cykge1xuICAgIGlmIChwcmV2aW91cyA9PT0gdGhpcy5kZWZhdWx0VmFsdWUgfHwgIUFycmF5LmlzQXJyYXkocHJldmlvdXMpKSB7XG4gICAgICByZXR1cm4gW3ZhbHVlXTtcbiAgICB9XG5cbiAgICByZXR1cm4gcHJldmlvdXMuY29uY2F0KHZhbHVlKTtcbiAgfVxuXG4gIC8qKlxuICAgKiBPbmx5IGFsbG93IG9wdGlvbiB2YWx1ZSB0byBiZSBvbmUgb2YgY2hvaWNlcy5cbiAgICpcbiAgICogQHBhcmFtIHtzdHJpbmdbXX0gdmFsdWVzXG4gICAqIEByZXR1cm4ge09wdGlvbn1cbiAgICovXG5cbiAgY2hvaWNlcyh2YWx1ZXMpIHtcbiAgICB0aGlzLmFyZ0Nob2ljZXMgPSB2YWx1ZXMuc2xpY2UoKTtcbiAgICB0aGlzLnBhcnNlQXJnID0gKGFyZywgcHJldmlvdXMpID0+IHtcbiAgICAgIGlmICghdGhpcy5hcmdDaG9pY2VzLmluY2x1ZGVzKGFyZykpIHtcbiAgICAgICAgdGhyb3cgbmV3IEludmFsaWRBcmd1bWVudEVycm9yKFxuICAgICAgICAgIGBBbGxvd2VkIGNob2ljZXMgYXJlICR7dGhpcy5hcmdDaG9pY2VzLmpvaW4oJywgJyl9LmAsXG4gICAgICAgICk7XG4gICAgICB9XG4gICAgICBpZiAodGhpcy52YXJpYWRpYykge1xuICAgICAgICByZXR1cm4gdGhpcy5fY29uY2F0VmFsdWUoYXJnLCBwcmV2aW91cyk7XG4gICAgICB9XG4gICAgICByZXR1cm4gYXJnO1xuICAgIH07XG4gICAgcmV0dXJuIHRoaXM7XG4gIH1cblxuICAvKipcbiAgICogUmV0dXJuIG9wdGlvbiBuYW1lLlxuICAgKlxuICAgKiBAcmV0dXJuIHtzdHJpbmd9XG4gICAqL1xuXG4gIG5hbWUoKSB7XG4gICAgaWYgKHRoaXMubG9uZykge1xuICAgICAgcmV0dXJuIHRoaXMubG9uZy5yZXBsYWNlKC9eLS0vLCAnJyk7XG4gICAgfVxuICAgIHJldHVybiB0aGlzLnNob3J0LnJlcGxhY2UoL14tLywgJycpO1xuICB9XG5cbiAgLyoqXG4gICAqIFJldHVybiBvcHRpb24gbmFtZSwgaW4gYSBjYW1lbGNhc2UgZm9ybWF0IHRoYXQgY2FuIGJlIHVzZWRcbiAgICogYXMgYSBvYmplY3QgYXR0cmlidXRlIGtleS5cbiAgICpcbiAgICogQHJldHVybiB7c3RyaW5nfVxuICAgKi9cblxuICBhdHRyaWJ1dGVOYW1lKCkge1xuICAgIHJldHVybiBjYW1lbGNhc2UodGhpcy5uYW1lKCkucmVwbGFjZSgvXm5vLS8sICcnKSk7XG4gIH1cblxuICAvKipcbiAgICogQ2hlY2sgaWYgYGFyZ2AgbWF0Y2hlcyB0aGUgc2hvcnQgb3IgbG9uZyBmbGFnLlxuICAgKlxuICAgKiBAcGFyYW0ge3N0cmluZ30gYXJnXG4gICAqIEByZXR1cm4ge2Jvb2xlYW59XG4gICAqIEBwYWNrYWdlXG4gICAqL1xuXG4gIGlzKGFyZykge1xuICAgIHJldHVybiB0aGlzLnNob3J0ID09PSBhcmcgfHwgdGhpcy5sb25nID09PSBhcmc7XG4gIH1cblxuICAvKipcbiAgICogUmV0dXJuIHdoZXRoZXIgYSBib29sZWFuIG9wdGlvbi5cbiAgICpcbiAgICogT3B0aW9ucyBhcmUgb25lIG9mIGJvb2xlYW4sIG5lZ2F0ZWQsIHJlcXVpcmVkIGFyZ3VtZW50LCBvciBvcHRpb25hbCBhcmd1bWVudC5cbiAgICpcbiAgICogQHJldHVybiB7Ym9vbGVhbn1cbiAgICogQHBhY2thZ2VcbiAgICovXG5cbiAgaXNCb29sZWFuKCkge1xuICAgIHJldHVybiAhdGhpcy5yZXF1aXJlZCAmJiAhdGhpcy5vcHRpb25hbCAmJiAhdGhpcy5uZWdhdGU7XG4gIH1cbn1cblxuLyoqXG4gKiBUaGlzIGNsYXNzIGlzIHRvIG1ha2UgaXQgZWFzaWVyIHRvIHdvcmsgd2l0aCBkdWFsIG9wdGlvbnMsIHdpdGhvdXQgY2hhbmdpbmcgdGhlIGV4aXN0aW5nXG4gKiBpbXBsZW1lbnRhdGlvbi4gV2Ugc3VwcG9ydCBzZXBhcmF0ZSBkdWFsIG9wdGlvbnMgZm9yIHNlcGFyYXRlIHBvc2l0aXZlIGFuZCBuZWdhdGl2ZSBvcHRpb25zLFxuICogbGlrZSBgLS1idWlsZGAgYW5kIGAtLW5vLWJ1aWxkYCwgd2hpY2ggc2hhcmUgYSBzaW5nbGUgb3B0aW9uIHZhbHVlLiBUaGlzIHdvcmtzIG5pY2VseSBmb3Igc29tZVxuICogdXNlIGNhc2VzLCBidXQgaXMgdHJpY2t5IGZvciBvdGhlcnMgd2hlcmUgd2Ugd2FudCBzZXBhcmF0ZSBiZWhhdmlvdXJzIGRlc3BpdGVcbiAqIHRoZSBzaW5nbGUgc2hhcmVkIG9wdGlvbiB2YWx1ZS5cbiAqL1xuY2xhc3MgRHVhbE9wdGlvbnMge1xuICAvKipcbiAgICogQHBhcmFtIHtPcHRpb25bXX0gb3B0aW9uc1xuICAgKi9cbiAgY29uc3RydWN0b3Iob3B0aW9ucykge1xuICAgIHRoaXMucG9zaXRpdmVPcHRpb25zID0gbmV3IE1hcCgpO1xuICAgIHRoaXMubmVnYXRpdmVPcHRpb25zID0gbmV3IE1hcCgpO1xuICAgIHRoaXMuZHVhbE9wdGlvbnMgPSBuZXcgU2V0KCk7XG4gICAgb3B0aW9ucy5mb3JFYWNoKChvcHRpb24pID0+IHtcbiAgICAgIGlmIChvcHRpb24ubmVnYXRlKSB7XG4gICAgICAgIHRoaXMubmVnYXRpdmVPcHRpb25zLnNldChvcHRpb24uYXR0cmlidXRlTmFtZSgpLCBvcHRpb24pO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgdGhpcy5wb3NpdGl2ZU9wdGlvbnMuc2V0KG9wdGlvbi5hdHRyaWJ1dGVOYW1lKCksIG9wdGlvbik7XG4gICAgICB9XG4gICAgfSk7XG4gICAgdGhpcy5uZWdhdGl2ZU9wdGlvbnMuZm9yRWFjaCgodmFsdWUsIGtleSkgPT4ge1xuICAgICAgaWYgKHRoaXMucG9zaXRpdmVPcHRpb25zLmhhcyhrZXkpKSB7XG4gICAgICAgIHRoaXMuZHVhbE9wdGlvbnMuYWRkKGtleSk7XG4gICAgICB9XG4gICAgfSk7XG4gIH1cblxuICAvKipcbiAgICogRGlkIHRoZSB2YWx1ZSBjb21lIGZyb20gdGhlIG9wdGlvbiwgYW5kIG5vdCBmcm9tIHBvc3NpYmxlIG1hdGNoaW5nIGR1YWwgb3B0aW9uP1xuICAgKlxuICAgKiBAcGFyYW0geyp9IHZhbHVlXG4gICAqIEBwYXJhbSB7T3B0aW9ufSBvcHRpb25cbiAgICogQHJldHVybnMge2Jvb2xlYW59XG4gICAqL1xuICB2YWx1ZUZyb21PcHRpb24odmFsdWUsIG9wdGlvbikge1xuICAgIGNvbnN0IG9wdGlvbktleSA9IG9wdGlvbi5hdHRyaWJ1dGVOYW1lKCk7XG4gICAgaWYgKCF0aGlzLmR1YWxPcHRpb25zLmhhcyhvcHRpb25LZXkpKSByZXR1cm4gdHJ1ZTtcblxuICAgIC8vIFVzZSB0aGUgdmFsdWUgdG8gZGVkdWNlIGlmIChwcm9iYWJseSkgY2FtZSBmcm9tIHRoZSBvcHRpb24uXG4gICAgY29uc3QgcHJlc2V0ID0gdGhpcy5uZWdhdGl2ZU9wdGlvbnMuZ2V0KG9wdGlvbktleSkucHJlc2V0QXJnO1xuICAgIGNvbnN0IG5lZ2F0aXZlVmFsdWUgPSBwcmVzZXQgIT09IHVuZGVmaW5lZCA/IHByZXNldCA6IGZhbHNlO1xuICAgIHJldHVybiBvcHRpb24ubmVnYXRlID09PSAobmVnYXRpdmVWYWx1ZSA9PT0gdmFsdWUpO1xuICB9XG59XG5cbi8qKlxuICogQ29udmVydCBzdHJpbmcgZnJvbSBrZWJhYi1jYXNlIHRvIGNhbWVsQ2FzZS5cbiAqXG4gKiBAcGFyYW0ge3N0cmluZ30gc3RyXG4gKiBAcmV0dXJuIHtzdHJpbmd9XG4gKiBAcHJpdmF0ZVxuICovXG5cbmZ1bmN0aW9uIGNhbWVsY2FzZShzdHIpIHtcbiAgcmV0dXJuIHN0ci5zcGxpdCgnLScpLnJlZHVjZSgoc3RyLCB3b3JkKSA9PiB7XG4gICAgcmV0dXJuIHN0ciArIHdvcmRbMF0udG9VcHBlckNhc2UoKSArIHdvcmQuc2xpY2UoMSk7XG4gIH0pO1xufVxuXG4vKipcbiAqIFNwbGl0IHRoZSBzaG9ydCBhbmQgbG9uZyBmbGFnIG91dCBvZiBzb21ldGhpbmcgbGlrZSAnLW0sLS1taXhlZCA8dmFsdWU+J1xuICpcbiAqIEBwcml2YXRlXG4gKi9cblxuZnVuY3Rpb24gc3BsaXRPcHRpb25GbGFncyhmbGFncykge1xuICBsZXQgc2hvcnRGbGFnO1xuICBsZXQgbG9uZ0ZsYWc7XG4gIC8vIFVzZSBvcmlnaW5hbCB2ZXJ5IGxvb3NlIHBhcnNpbmcgdG8gbWFpbnRhaW4gYmFja3dhcmRzIGNvbXBhdGliaWxpdHkgZm9yIG5vdyxcbiAgLy8gd2hpY2ggYWxsb3dlZCBmb3IgZXhhbXBsZSB1bmludGVuZGVkIGAtc3csIC0tc2hvcnQtd29yZGAgW3NpY10uXG4gIGNvbnN0IGZsYWdQYXJ0cyA9IGZsYWdzLnNwbGl0KC9bIHwsXSsvKTtcbiAgaWYgKGZsYWdQYXJ0cy5sZW5ndGggPiAxICYmICEvXltbPF0vLnRlc3QoZmxhZ1BhcnRzWzFdKSlcbiAgICBzaG9ydEZsYWcgPSBmbGFnUGFydHMuc2hpZnQoKTtcbiAgbG9uZ0ZsYWcgPSBmbGFnUGFydHMuc2hpZnQoKTtcbiAgLy8gQWRkIHN1cHBvcnQgZm9yIGxvbmUgc2hvcnQgZmxhZyB3aXRob3V0IHNpZ25pZmljYW50bHkgY2hhbmdpbmcgcGFyc2luZyFcbiAgaWYgKCFzaG9ydEZsYWcgJiYgL14tW14tXSQvLnRlc3QobG9uZ0ZsYWcpKSB7XG4gICAgc2hvcnRGbGFnID0gbG9uZ0ZsYWc7XG4gICAgbG9uZ0ZsYWcgPSB1bmRlZmluZWQ7XG4gIH1cbiAgcmV0dXJuIHsgc2hvcnRGbGFnLCBsb25nRmxhZyB9O1xufVxuXG5leHBvcnRzLk9wdGlvbiA9IE9wdGlvbjtcbmV4cG9ydHMuRHVhbE9wdGlvbnMgPSBEdWFsT3B0aW9ucztcbiIsImNvbnN0IG1heERpc3RhbmNlID0gMztcblxuZnVuY3Rpb24gZWRpdERpc3RhbmNlKGEsIGIpIHtcbiAgLy8gaHR0cHM6Ly9lbi53aWtpcGVkaWEub3JnL3dpa2kvRGFtZXJhdeKAk0xldmVuc2h0ZWluX2Rpc3RhbmNlXG4gIC8vIENhbGN1bGF0aW5nIG9wdGltYWwgc3RyaW5nIGFsaWdubWVudCBkaXN0YW5jZSwgbm8gc3Vic3RyaW5nIGlzIGVkaXRlZCBtb3JlIHRoYW4gb25jZS5cbiAgLy8gKFNpbXBsZSBpbXBsZW1lbnRhdGlvbi4pXG5cbiAgLy8gUXVpY2sgZWFybHkgZXhpdCwgcmV0dXJuIHdvcnN0IGNhc2UuXG4gIGlmIChNYXRoLmFicyhhLmxlbmd0aCAtIGIubGVuZ3RoKSA+IG1heERpc3RhbmNlKVxuICAgIHJldHVybiBNYXRoLm1heChhLmxlbmd0aCwgYi5sZW5ndGgpO1xuXG4gIC8vIGRpc3RhbmNlIGJldHdlZW4gcHJlZml4IHN1YnN0cmluZ3Mgb2YgYSBhbmQgYlxuICBjb25zdCBkID0gW107XG5cbiAgLy8gcHVyZSBkZWxldGlvbnMgdHVybiBhIGludG8gZW1wdHkgc3RyaW5nXG4gIGZvciAobGV0IGkgPSAwOyBpIDw9IGEubGVuZ3RoOyBpKyspIHtcbiAgICBkW2ldID0gW2ldO1xuICB9XG4gIC8vIHB1cmUgaW5zZXJ0aW9ucyB0dXJuIGVtcHR5IHN0cmluZyBpbnRvIGJcbiAgZm9yIChsZXQgaiA9IDA7IGogPD0gYi5sZW5ndGg7IGorKykge1xuICAgIGRbMF1bal0gPSBqO1xuICB9XG5cbiAgLy8gZmlsbCBtYXRyaXhcbiAgZm9yIChsZXQgaiA9IDE7IGogPD0gYi5sZW5ndGg7IGorKykge1xuICAgIGZvciAobGV0IGkgPSAxOyBpIDw9IGEubGVuZ3RoOyBpKyspIHtcbiAgICAgIGxldCBjb3N0ID0gMTtcbiAgICAgIGlmIChhW2kgLSAxXSA9PT0gYltqIC0gMV0pIHtcbiAgICAgICAgY29zdCA9IDA7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICBjb3N0ID0gMTtcbiAgICAgIH1cbiAgICAgIGRbaV1bal0gPSBNYXRoLm1pbihcbiAgICAgICAgZFtpIC0gMV1bal0gKyAxLCAvLyBkZWxldGlvblxuICAgICAgICBkW2ldW2ogLSAxXSArIDEsIC8vIGluc2VydGlvblxuICAgICAgICBkW2kgLSAxXVtqIC0gMV0gKyBjb3N0LCAvLyBzdWJzdGl0dXRpb25cbiAgICAgICk7XG4gICAgICAvLyB0cmFuc3Bvc2l0aW9uXG4gICAgICBpZiAoaSA+IDEgJiYgaiA+IDEgJiYgYVtpIC0gMV0gPT09IGJbaiAtIDJdICYmIGFbaSAtIDJdID09PSBiW2ogLSAxXSkge1xuICAgICAgICBkW2ldW2pdID0gTWF0aC5taW4oZFtpXVtqXSwgZFtpIC0gMl1baiAtIDJdICsgMSk7XG4gICAgICB9XG4gICAgfVxuICB9XG5cbiAgcmV0dXJuIGRbYS5sZW5ndGhdW2IubGVuZ3RoXTtcbn1cblxuLyoqXG4gKiBGaW5kIGNsb3NlIG1hdGNoZXMsIHJlc3RyaWN0ZWQgdG8gc2FtZSBudW1iZXIgb2YgZWRpdHMuXG4gKlxuICogQHBhcmFtIHtzdHJpbmd9IHdvcmRcbiAqIEBwYXJhbSB7c3RyaW5nW119IGNhbmRpZGF0ZXNcbiAqIEByZXR1cm5zIHtzdHJpbmd9XG4gKi9cblxuZnVuY3Rpb24gc3VnZ2VzdFNpbWlsYXIod29yZCwgY2FuZGlkYXRlcykge1xuICBpZiAoIWNhbmRpZGF0ZXMgfHwgY2FuZGlkYXRlcy5sZW5ndGggPT09IDApIHJldHVybiAnJztcbiAgLy8gcmVtb3ZlIHBvc3NpYmxlIGR1cGxpY2F0ZXNcbiAgY2FuZGlkYXRlcyA9IEFycmF5LmZyb20obmV3IFNldChjYW5kaWRhdGVzKSk7XG5cbiAgY29uc3Qgc2VhcmNoaW5nT3B0aW9ucyA9IHdvcmQuc3RhcnRzV2l0aCgnLS0nKTtcbiAgaWYgKHNlYXJjaGluZ09wdGlvbnMpIHtcbiAgICB3b3JkID0gd29yZC5zbGljZSgyKTtcbiAgICBjYW5kaWRhdGVzID0gY2FuZGlkYXRlcy5tYXAoKGNhbmRpZGF0ZSkgPT4gY2FuZGlkYXRlLnNsaWNlKDIpKTtcbiAgfVxuXG4gIGxldCBzaW1pbGFyID0gW107XG4gIGxldCBiZXN0RGlzdGFuY2UgPSBtYXhEaXN0YW5jZTtcbiAgY29uc3QgbWluU2ltaWxhcml0eSA9IDAuNDtcbiAgY2FuZGlkYXRlcy5mb3JFYWNoKChjYW5kaWRhdGUpID0+IHtcbiAgICBpZiAoY2FuZGlkYXRlLmxlbmd0aCA8PSAxKSByZXR1cm47IC8vIG5vIG9uZSBjaGFyYWN0ZXIgZ3Vlc3Nlc1xuXG4gICAgY29uc3QgZGlzdGFuY2UgPSBlZGl0RGlzdGFuY2Uod29yZCwgY2FuZGlkYXRlKTtcbiAgICBjb25zdCBsZW5ndGggPSBNYXRoLm1heCh3b3JkLmxlbmd0aCwgY2FuZGlkYXRlLmxlbmd0aCk7XG4gICAgY29uc3Qgc2ltaWxhcml0eSA9IChsZW5ndGggLSBkaXN0YW5jZSkgLyBsZW5ndGg7XG4gICAgaWYgKHNpbWlsYXJpdHkgPiBtaW5TaW1pbGFyaXR5KSB7XG4gICAgICBpZiAoZGlzdGFuY2UgPCBiZXN0RGlzdGFuY2UpIHtcbiAgICAgICAgLy8gYmV0dGVyIGVkaXQgZGlzdGFuY2UsIHRocm93IGF3YXkgcHJldmlvdXMgd29yc2UgbWF0Y2hlc1xuICAgICAgICBiZXN0RGlzdGFuY2UgPSBkaXN0YW5jZTtcbiAgICAgICAgc2ltaWxhciA9IFtjYW5kaWRhdGVdO1xuICAgICAgfSBlbHNlIGlmIChkaXN0YW5jZSA9PT0gYmVzdERpc3RhbmNlKSB7XG4gICAgICAgIHNpbWlsYXIucHVzaChjYW5kaWRhdGUpO1xuICAgICAgfVxuICAgIH1cbiAgfSk7XG5cbiAgc2ltaWxhci5zb3J0KChhLCBiKSA9PiBhLmxvY2FsZUNvbXBhcmUoYikpO1xuICBpZiAoc2VhcmNoaW5nT3B0aW9ucykge1xuICAgIHNpbWlsYXIgPSBzaW1pbGFyLm1hcCgoY2FuZGlkYXRlKSA9PiBgLS0ke2NhbmRpZGF0ZX1gKTtcbiAgfVxuXG4gIGlmIChzaW1pbGFyLmxlbmd0aCA+IDEpIHtcbiAgICByZXR1cm4gYFxcbihEaWQgeW91IG1lYW4gb25lIG9mICR7c2ltaWxhci5qb2luKCcsICcpfT8pYDtcbiAgfVxuICBpZiAoc2ltaWxhci5sZW5ndGggPT09IDEpIHtcbiAgICByZXR1cm4gYFxcbihEaWQgeW91IG1lYW4gJHtzaW1pbGFyWzBdfT8pYDtcbiAgfVxuICByZXR1cm4gJyc7XG59XG5cbmV4cG9ydHMuc3VnZ2VzdFNpbWlsYXIgPSBzdWdnZXN0U2ltaWxhcjtcbiIsImltcG9ydCBhbnNpU3R5bGVzIGZyb20gJyNhbnNpLXN0eWxlcyc7XG5pbXBvcnQgc3VwcG9ydHNDb2xvciBmcm9tICcjc3VwcG9ydHMtY29sb3InO1xuaW1wb3J0IHsgLy8gZXNsaW50LWRpc2FibGUtbGluZSBpbXBvcnQvb3JkZXJcblx0c3RyaW5nUmVwbGFjZUFsbCxcblx0c3RyaW5nRW5jYXNlQ1JMRldpdGhGaXJzdEluZGV4LFxufSBmcm9tICcuL3V0aWxpdGllcy5qcyc7XG5cbmNvbnN0IHtzdGRvdXQ6IHN0ZG91dENvbG9yLCBzdGRlcnI6IHN0ZGVyckNvbG9yfSA9IHN1cHBvcnRzQ29sb3I7XG5cbmNvbnN0IEdFTkVSQVRPUiA9IFN5bWJvbCgnR0VORVJBVE9SJyk7XG5jb25zdCBTVFlMRVIgPSBTeW1ib2woJ1NUWUxFUicpO1xuY29uc3QgSVNfRU1QVFkgPSBTeW1ib2woJ0lTX0VNUFRZJyk7XG5cbi8vIGBzdXBwb3J0c0NvbG9yLmxldmVsYCDihpIgYGFuc2lTdHlsZXMuY29sb3JbbmFtZV1gIG1hcHBpbmdcbmNvbnN0IGxldmVsTWFwcGluZyA9IFtcblx0J2Fuc2knLFxuXHQnYW5zaScsXG5cdCdhbnNpMjU2Jyxcblx0J2Fuc2kxNm0nLFxuXTtcblxuY29uc3Qgc3R5bGVzID0gT2JqZWN0LmNyZWF0ZShudWxsKTtcblxuY29uc3QgYXBwbHlPcHRpb25zID0gKG9iamVjdCwgb3B0aW9ucyA9IHt9KSA9PiB7XG5cdGlmIChvcHRpb25zLmxldmVsICYmICEoTnVtYmVyLmlzSW50ZWdlcihvcHRpb25zLmxldmVsKSAmJiBvcHRpb25zLmxldmVsID49IDAgJiYgb3B0aW9ucy5sZXZlbCA8PSAzKSkge1xuXHRcdHRocm93IG5ldyBFcnJvcignVGhlIGBsZXZlbGAgb3B0aW9uIHNob3VsZCBiZSBhbiBpbnRlZ2VyIGZyb20gMCB0byAzJyk7XG5cdH1cblxuXHQvLyBEZXRlY3QgbGV2ZWwgaWYgbm90IHNldCBtYW51YWxseVxuXHRjb25zdCBjb2xvckxldmVsID0gc3Rkb3V0Q29sb3IgPyBzdGRvdXRDb2xvci5sZXZlbCA6IDA7XG5cdG9iamVjdC5sZXZlbCA9IG9wdGlvbnMubGV2ZWwgPT09IHVuZGVmaW5lZCA/IGNvbG9yTGV2ZWwgOiBvcHRpb25zLmxldmVsO1xufTtcblxuZXhwb3J0IGNsYXNzIENoYWxrIHtcblx0Y29uc3RydWN0b3Iob3B0aW9ucykge1xuXHRcdC8vIGVzbGludC1kaXNhYmxlLW5leHQtbGluZSBuby1jb25zdHJ1Y3Rvci1yZXR1cm5cblx0XHRyZXR1cm4gY2hhbGtGYWN0b3J5KG9wdGlvbnMpO1xuXHR9XG59XG5cbmNvbnN0IGNoYWxrRmFjdG9yeSA9IG9wdGlvbnMgPT4ge1xuXHRjb25zdCBjaGFsayA9ICguLi5zdHJpbmdzKSA9PiBzdHJpbmdzLmpvaW4oJyAnKTtcblx0YXBwbHlPcHRpb25zKGNoYWxrLCBvcHRpb25zKTtcblxuXHRPYmplY3Quc2V0UHJvdG90eXBlT2YoY2hhbGssIGNyZWF0ZUNoYWxrLnByb3RvdHlwZSk7XG5cblx0cmV0dXJuIGNoYWxrO1xufTtcblxuZnVuY3Rpb24gY3JlYXRlQ2hhbGsob3B0aW9ucykge1xuXHRyZXR1cm4gY2hhbGtGYWN0b3J5KG9wdGlvbnMpO1xufVxuXG5PYmplY3Quc2V0UHJvdG90eXBlT2YoY3JlYXRlQ2hhbGsucHJvdG90eXBlLCBGdW5jdGlvbi5wcm90b3R5cGUpO1xuXG5mb3IgKGNvbnN0IFtzdHlsZU5hbWUsIHN0eWxlXSBvZiBPYmplY3QuZW50cmllcyhhbnNpU3R5bGVzKSkge1xuXHRzdHlsZXNbc3R5bGVOYW1lXSA9IHtcblx0XHRnZXQoKSB7XG5cdFx0XHRjb25zdCBidWlsZGVyID0gY3JlYXRlQnVpbGRlcih0aGlzLCBjcmVhdGVTdHlsZXIoc3R5bGUub3Blbiwgc3R5bGUuY2xvc2UsIHRoaXNbU1RZTEVSXSksIHRoaXNbSVNfRU1QVFldKTtcblx0XHRcdE9iamVjdC5kZWZpbmVQcm9wZXJ0eSh0aGlzLCBzdHlsZU5hbWUsIHt2YWx1ZTogYnVpbGRlcn0pO1xuXHRcdFx0cmV0dXJuIGJ1aWxkZXI7XG5cdFx0fSxcblx0fTtcbn1cblxuc3R5bGVzLnZpc2libGUgPSB7XG5cdGdldCgpIHtcblx0XHRjb25zdCBidWlsZGVyID0gY3JlYXRlQnVpbGRlcih0aGlzLCB0aGlzW1NUWUxFUl0sIHRydWUpO1xuXHRcdE9iamVjdC5kZWZpbmVQcm9wZXJ0eSh0aGlzLCAndmlzaWJsZScsIHt2YWx1ZTogYnVpbGRlcn0pO1xuXHRcdHJldHVybiBidWlsZGVyO1xuXHR9LFxufTtcblxuY29uc3QgZ2V0TW9kZWxBbnNpID0gKG1vZGVsLCBsZXZlbCwgdHlwZSwgLi4uYXJndW1lbnRzXykgPT4ge1xuXHRpZiAobW9kZWwgPT09ICdyZ2InKSB7XG5cdFx0aWYgKGxldmVsID09PSAnYW5zaTE2bScpIHtcblx0XHRcdHJldHVybiBhbnNpU3R5bGVzW3R5cGVdLmFuc2kxNm0oLi4uYXJndW1lbnRzXyk7XG5cdFx0fVxuXG5cdFx0aWYgKGxldmVsID09PSAnYW5zaTI1NicpIHtcblx0XHRcdHJldHVybiBhbnNpU3R5bGVzW3R5cGVdLmFuc2kyNTYoYW5zaVN0eWxlcy5yZ2JUb0Fuc2kyNTYoLi4uYXJndW1lbnRzXykpO1xuXHRcdH1cblxuXHRcdHJldHVybiBhbnNpU3R5bGVzW3R5cGVdLmFuc2koYW5zaVN0eWxlcy5yZ2JUb0Fuc2koLi4uYXJndW1lbnRzXykpO1xuXHR9XG5cblx0aWYgKG1vZGVsID09PSAnaGV4Jykge1xuXHRcdHJldHVybiBnZXRNb2RlbEFuc2koJ3JnYicsIGxldmVsLCB0eXBlLCAuLi5hbnNpU3R5bGVzLmhleFRvUmdiKC4uLmFyZ3VtZW50c18pKTtcblx0fVxuXG5cdHJldHVybiBhbnNpU3R5bGVzW3R5cGVdW21vZGVsXSguLi5hcmd1bWVudHNfKTtcbn07XG5cbmNvbnN0IHVzZWRNb2RlbHMgPSBbJ3JnYicsICdoZXgnLCAnYW5zaTI1NiddO1xuXG5mb3IgKGNvbnN0IG1vZGVsIG9mIHVzZWRNb2RlbHMpIHtcblx0c3R5bGVzW21vZGVsXSA9IHtcblx0XHRnZXQoKSB7XG5cdFx0XHRjb25zdCB7bGV2ZWx9ID0gdGhpcztcblx0XHRcdHJldHVybiBmdW5jdGlvbiAoLi4uYXJndW1lbnRzXykge1xuXHRcdFx0XHRjb25zdCBzdHlsZXIgPSBjcmVhdGVTdHlsZXIoZ2V0TW9kZWxBbnNpKG1vZGVsLCBsZXZlbE1hcHBpbmdbbGV2ZWxdLCAnY29sb3InLCAuLi5hcmd1bWVudHNfKSwgYW5zaVN0eWxlcy5jb2xvci5jbG9zZSwgdGhpc1tTVFlMRVJdKTtcblx0XHRcdFx0cmV0dXJuIGNyZWF0ZUJ1aWxkZXIodGhpcywgc3R5bGVyLCB0aGlzW0lTX0VNUFRZXSk7XG5cdFx0XHR9O1xuXHRcdH0sXG5cdH07XG5cblx0Y29uc3QgYmdNb2RlbCA9ICdiZycgKyBtb2RlbFswXS50b1VwcGVyQ2FzZSgpICsgbW9kZWwuc2xpY2UoMSk7XG5cdHN0eWxlc1tiZ01vZGVsXSA9IHtcblx0XHRnZXQoKSB7XG5cdFx0XHRjb25zdCB7bGV2ZWx9ID0gdGhpcztcblx0XHRcdHJldHVybiBmdW5jdGlvbiAoLi4uYXJndW1lbnRzXykge1xuXHRcdFx0XHRjb25zdCBzdHlsZXIgPSBjcmVhdGVTdHlsZXIoZ2V0TW9kZWxBbnNpKG1vZGVsLCBsZXZlbE1hcHBpbmdbbGV2ZWxdLCAnYmdDb2xvcicsIC4uLmFyZ3VtZW50c18pLCBhbnNpU3R5bGVzLmJnQ29sb3IuY2xvc2UsIHRoaXNbU1RZTEVSXSk7XG5cdFx0XHRcdHJldHVybiBjcmVhdGVCdWlsZGVyKHRoaXMsIHN0eWxlciwgdGhpc1tJU19FTVBUWV0pO1xuXHRcdFx0fTtcblx0XHR9LFxuXHR9O1xufVxuXG5jb25zdCBwcm90byA9IE9iamVjdC5kZWZpbmVQcm9wZXJ0aWVzKCgpID0+IHt9LCB7XG5cdC4uLnN0eWxlcyxcblx0bGV2ZWw6IHtcblx0XHRlbnVtZXJhYmxlOiB0cnVlLFxuXHRcdGdldCgpIHtcblx0XHRcdHJldHVybiB0aGlzW0dFTkVSQVRPUl0ubGV2ZWw7XG5cdFx0fSxcblx0XHRzZXQobGV2ZWwpIHtcblx0XHRcdHRoaXNbR0VORVJBVE9SXS5sZXZlbCA9IGxldmVsO1xuXHRcdH0sXG5cdH0sXG59KTtcblxuY29uc3QgY3JlYXRlU3R5bGVyID0gKG9wZW4sIGNsb3NlLCBwYXJlbnQpID0+IHtcblx0bGV0IG9wZW5BbGw7XG5cdGxldCBjbG9zZUFsbDtcblx0aWYgKHBhcmVudCA9PT0gdW5kZWZpbmVkKSB7XG5cdFx0b3BlbkFsbCA9IG9wZW47XG5cdFx0Y2xvc2VBbGwgPSBjbG9zZTtcblx0fSBlbHNlIHtcblx0XHRvcGVuQWxsID0gcGFyZW50Lm9wZW5BbGwgKyBvcGVuO1xuXHRcdGNsb3NlQWxsID0gY2xvc2UgKyBwYXJlbnQuY2xvc2VBbGw7XG5cdH1cblxuXHRyZXR1cm4ge1xuXHRcdG9wZW4sXG5cdFx0Y2xvc2UsXG5cdFx0b3BlbkFsbCxcblx0XHRjbG9zZUFsbCxcblx0XHRwYXJlbnQsXG5cdH07XG59O1xuXG5jb25zdCBjcmVhdGVCdWlsZGVyID0gKHNlbGYsIF9zdHlsZXIsIF9pc0VtcHR5KSA9PiB7XG5cdC8vIFNpbmdsZSBhcmd1bWVudCBpcyBob3QgcGF0aCwgaW1wbGljaXQgY29lcmNpb24gaXMgZmFzdGVyIHRoYW4gYW55dGhpbmdcblx0Ly8gZXNsaW50LWRpc2FibGUtbmV4dC1saW5lIG5vLWltcGxpY2l0LWNvZXJjaW9uXG5cdGNvbnN0IGJ1aWxkZXIgPSAoLi4uYXJndW1lbnRzXykgPT4gYXBwbHlTdHlsZShidWlsZGVyLCAoYXJndW1lbnRzXy5sZW5ndGggPT09IDEpID8gKCcnICsgYXJndW1lbnRzX1swXSkgOiBhcmd1bWVudHNfLmpvaW4oJyAnKSk7XG5cblx0Ly8gV2UgYWx0ZXIgdGhlIHByb3RvdHlwZSBiZWNhdXNlIHdlIG11c3QgcmV0dXJuIGEgZnVuY3Rpb24sIGJ1dCB0aGVyZSBpc1xuXHQvLyBubyB3YXkgdG8gY3JlYXRlIGEgZnVuY3Rpb24gd2l0aCBhIGRpZmZlcmVudCBwcm90b3R5cGVcblx0T2JqZWN0LnNldFByb3RvdHlwZU9mKGJ1aWxkZXIsIHByb3RvKTtcblxuXHRidWlsZGVyW0dFTkVSQVRPUl0gPSBzZWxmO1xuXHRidWlsZGVyW1NUWUxFUl0gPSBfc3R5bGVyO1xuXHRidWlsZGVyW0lTX0VNUFRZXSA9IF9pc0VtcHR5O1xuXG5cdHJldHVybiBidWlsZGVyO1xufTtcblxuY29uc3QgYXBwbHlTdHlsZSA9IChzZWxmLCBzdHJpbmcpID0+IHtcblx0aWYgKHNlbGYubGV2ZWwgPD0gMCB8fCAhc3RyaW5nKSB7XG5cdFx0cmV0dXJuIHNlbGZbSVNfRU1QVFldID8gJycgOiBzdHJpbmc7XG5cdH1cblxuXHRsZXQgc3R5bGVyID0gc2VsZltTVFlMRVJdO1xuXG5cdGlmIChzdHlsZXIgPT09IHVuZGVmaW5lZCkge1xuXHRcdHJldHVybiBzdHJpbmc7XG5cdH1cblxuXHRjb25zdCB7b3BlbkFsbCwgY2xvc2VBbGx9ID0gc3R5bGVyO1xuXHRpZiAoc3RyaW5nLmluY2x1ZGVzKCdcXHUwMDFCJykpIHtcblx0XHR3aGlsZSAoc3R5bGVyICE9PSB1bmRlZmluZWQpIHtcblx0XHRcdC8vIFJlcGxhY2UgYW55IGluc3RhbmNlcyBhbHJlYWR5IHByZXNlbnQgd2l0aCBhIHJlLW9wZW5pbmcgY29kZVxuXHRcdFx0Ly8gb3RoZXJ3aXNlIG9ubHkgdGhlIHBhcnQgb2YgdGhlIHN0cmluZyB1bnRpbCBzYWlkIGNsb3NpbmcgY29kZVxuXHRcdFx0Ly8gd2lsbCBiZSBjb2xvcmVkLCBhbmQgdGhlIHJlc3Qgd2lsbCBzaW1wbHkgYmUgJ3BsYWluJy5cblx0XHRcdHN0cmluZyA9IHN0cmluZ1JlcGxhY2VBbGwoc3RyaW5nLCBzdHlsZXIuY2xvc2UsIHN0eWxlci5vcGVuKTtcblxuXHRcdFx0c3R5bGVyID0gc3R5bGVyLnBhcmVudDtcblx0XHR9XG5cdH1cblxuXHQvLyBXZSBjYW4gbW92ZSBib3RoIG5leHQgYWN0aW9ucyBvdXQgb2YgbG9vcCwgYmVjYXVzZSByZW1haW5pbmcgYWN0aW9ucyBpbiBsb29wIHdvbid0IGhhdmVcblx0Ly8gYW55L3Zpc2libGUgZWZmZWN0IG9uIHBhcnRzIHdlIGFkZCBoZXJlLiBDbG9zZSB0aGUgc3R5bGluZyBiZWZvcmUgYSBsaW5lYnJlYWsgYW5kIHJlb3BlblxuXHQvLyBhZnRlciBuZXh0IGxpbmUgdG8gZml4IGEgYmxlZWQgaXNzdWUgb24gbWFjT1M6IGh0dHBzOi8vZ2l0aHViLmNvbS9jaGFsay9jaGFsay9wdWxsLzkyXG5cdGNvbnN0IGxmSW5kZXggPSBzdHJpbmcuaW5kZXhPZignXFxuJyk7XG5cdGlmIChsZkluZGV4ICE9PSAtMSkge1xuXHRcdHN0cmluZyA9IHN0cmluZ0VuY2FzZUNSTEZXaXRoRmlyc3RJbmRleChzdHJpbmcsIGNsb3NlQWxsLCBvcGVuQWxsLCBsZkluZGV4KTtcblx0fVxuXG5cdHJldHVybiBvcGVuQWxsICsgc3RyaW5nICsgY2xvc2VBbGw7XG59O1xuXG5PYmplY3QuZGVmaW5lUHJvcGVydGllcyhjcmVhdGVDaGFsay5wcm90b3R5cGUsIHN0eWxlcyk7XG5cbmNvbnN0IGNoYWxrID0gY3JlYXRlQ2hhbGsoKTtcbmV4cG9ydCBjb25zdCBjaGFsa1N0ZGVyciA9IGNyZWF0ZUNoYWxrKHtsZXZlbDogc3RkZXJyQ29sb3IgPyBzdGRlcnJDb2xvci5sZXZlbCA6IDB9KTtcblxuZXhwb3J0IHtcblx0bW9kaWZpZXJOYW1lcyxcblx0Zm9yZWdyb3VuZENvbG9yTmFtZXMsXG5cdGJhY2tncm91bmRDb2xvck5hbWVzLFxuXHRjb2xvck5hbWVzLFxuXG5cdC8vIFRPRE86IFJlbW92ZSB0aGVzZSBhbGlhc2VzIGluIHRoZSBuZXh0IG1ham9yIHZlcnNpb25cblx0bW9kaWZpZXJOYW1lcyBhcyBtb2RpZmllcnMsXG5cdGZvcmVncm91bmRDb2xvck5hbWVzIGFzIGZvcmVncm91bmRDb2xvcnMsXG5cdGJhY2tncm91bmRDb2xvck5hbWVzIGFzIGJhY2tncm91bmRDb2xvcnMsXG5cdGNvbG9yTmFtZXMgYXMgY29sb3JzLFxufSBmcm9tICcuL3ZlbmRvci9hbnNpLXN0eWxlcy9pbmRleC5qcyc7XG5cbmV4cG9ydCB7XG5cdHN0ZG91dENvbG9yIGFzIHN1cHBvcnRzQ29sb3IsXG5cdHN0ZGVyckNvbG9yIGFzIHN1cHBvcnRzQ29sb3JTdGRlcnIsXG59O1xuXG5leHBvcnQgZGVmYXVsdCBjaGFsaztcbiIsIi8vIFRPRE86IFdoZW4gdGFyZ2V0aW5nIE5vZGUuanMgMTYsIHVzZSBgU3RyaW5nLnByb3RvdHlwZS5yZXBsYWNlQWxsYC5cbmV4cG9ydCBmdW5jdGlvbiBzdHJpbmdSZXBsYWNlQWxsKHN0cmluZywgc3Vic3RyaW5nLCByZXBsYWNlcikge1xuXHRsZXQgaW5kZXggPSBzdHJpbmcuaW5kZXhPZihzdWJzdHJpbmcpO1xuXHRpZiAoaW5kZXggPT09IC0xKSB7XG5cdFx0cmV0dXJuIHN0cmluZztcblx0fVxuXG5cdGNvbnN0IHN1YnN0cmluZ0xlbmd0aCA9IHN1YnN0cmluZy5sZW5ndGg7XG5cdGxldCBlbmRJbmRleCA9IDA7XG5cdGxldCByZXR1cm5WYWx1ZSA9ICcnO1xuXHRkbyB7XG5cdFx0cmV0dXJuVmFsdWUgKz0gc3RyaW5nLnNsaWNlKGVuZEluZGV4LCBpbmRleCkgKyBzdWJzdHJpbmcgKyByZXBsYWNlcjtcblx0XHRlbmRJbmRleCA9IGluZGV4ICsgc3Vic3RyaW5nTGVuZ3RoO1xuXHRcdGluZGV4ID0gc3RyaW5nLmluZGV4T2Yoc3Vic3RyaW5nLCBlbmRJbmRleCk7XG5cdH0gd2hpbGUgKGluZGV4ICE9PSAtMSk7XG5cblx0cmV0dXJuVmFsdWUgKz0gc3RyaW5nLnNsaWNlKGVuZEluZGV4KTtcblx0cmV0dXJuIHJldHVyblZhbHVlO1xufVxuXG5leHBvcnQgZnVuY3Rpb24gc3RyaW5nRW5jYXNlQ1JMRldpdGhGaXJzdEluZGV4KHN0cmluZywgcHJlZml4LCBwb3N0Zml4LCBpbmRleCkge1xuXHRsZXQgZW5kSW5kZXggPSAwO1xuXHRsZXQgcmV0dXJuVmFsdWUgPSAnJztcblx0ZG8ge1xuXHRcdGNvbnN0IGdvdENSID0gc3RyaW5nW2luZGV4IC0gMV0gPT09ICdcXHInO1xuXHRcdHJldHVyblZhbHVlICs9IHN0cmluZy5zbGljZShlbmRJbmRleCwgKGdvdENSID8gaW5kZXggLSAxIDogaW5kZXgpKSArIHByZWZpeCArIChnb3RDUiA/ICdcXHJcXG4nIDogJ1xcbicpICsgcG9zdGZpeDtcblx0XHRlbmRJbmRleCA9IGluZGV4ICsgMTtcblx0XHRpbmRleCA9IHN0cmluZy5pbmRleE9mKCdcXG4nLCBlbmRJbmRleCk7XG5cdH0gd2hpbGUgKGluZGV4ICE9PSAtMSk7XG5cblx0cmV0dXJuVmFsdWUgKz0gc3RyaW5nLnNsaWNlKGVuZEluZGV4KTtcblx0cmV0dXJuIHJldHVyblZhbHVlO1xufVxuIiwiY29uc3QgQU5TSV9CQUNLR1JPVU5EX09GRlNFVCA9IDEwO1xuXG5jb25zdCB3cmFwQW5zaTE2ID0gKG9mZnNldCA9IDApID0+IGNvZGUgPT4gYFxcdTAwMUJbJHtjb2RlICsgb2Zmc2V0fW1gO1xuXG5jb25zdCB3cmFwQW5zaTI1NiA9IChvZmZzZXQgPSAwKSA9PiBjb2RlID0+IGBcXHUwMDFCWyR7MzggKyBvZmZzZXR9OzU7JHtjb2RlfW1gO1xuXG5jb25zdCB3cmFwQW5zaTE2bSA9IChvZmZzZXQgPSAwKSA9PiAocmVkLCBncmVlbiwgYmx1ZSkgPT4gYFxcdTAwMUJbJHszOCArIG9mZnNldH07Mjske3JlZH07JHtncmVlbn07JHtibHVlfW1gO1xuXG5jb25zdCBzdHlsZXMgPSB7XG5cdG1vZGlmaWVyOiB7XG5cdFx0cmVzZXQ6IFswLCAwXSxcblx0XHQvLyAyMSBpc24ndCB3aWRlbHkgc3VwcG9ydGVkIGFuZCAyMiBkb2VzIHRoZSBzYW1lIHRoaW5nXG5cdFx0Ym9sZDogWzEsIDIyXSxcblx0XHRkaW06IFsyLCAyMl0sXG5cdFx0aXRhbGljOiBbMywgMjNdLFxuXHRcdHVuZGVybGluZTogWzQsIDI0XSxcblx0XHRvdmVybGluZTogWzUzLCA1NV0sXG5cdFx0aW52ZXJzZTogWzcsIDI3XSxcblx0XHRoaWRkZW46IFs4LCAyOF0sXG5cdFx0c3RyaWtldGhyb3VnaDogWzksIDI5XSxcblx0fSxcblx0Y29sb3I6IHtcblx0XHRibGFjazogWzMwLCAzOV0sXG5cdFx0cmVkOiBbMzEsIDM5XSxcblx0XHRncmVlbjogWzMyLCAzOV0sXG5cdFx0eWVsbG93OiBbMzMsIDM5XSxcblx0XHRibHVlOiBbMzQsIDM5XSxcblx0XHRtYWdlbnRhOiBbMzUsIDM5XSxcblx0XHRjeWFuOiBbMzYsIDM5XSxcblx0XHR3aGl0ZTogWzM3LCAzOV0sXG5cblx0XHQvLyBCcmlnaHQgY29sb3Jcblx0XHRibGFja0JyaWdodDogWzkwLCAzOV0sXG5cdFx0Z3JheTogWzkwLCAzOV0sIC8vIEFsaWFzIG9mIGBibGFja0JyaWdodGBcblx0XHRncmV5OiBbOTAsIDM5XSwgLy8gQWxpYXMgb2YgYGJsYWNrQnJpZ2h0YFxuXHRcdHJlZEJyaWdodDogWzkxLCAzOV0sXG5cdFx0Z3JlZW5CcmlnaHQ6IFs5MiwgMzldLFxuXHRcdHllbGxvd0JyaWdodDogWzkzLCAzOV0sXG5cdFx0Ymx1ZUJyaWdodDogWzk0LCAzOV0sXG5cdFx0bWFnZW50YUJyaWdodDogWzk1LCAzOV0sXG5cdFx0Y3lhbkJyaWdodDogWzk2LCAzOV0sXG5cdFx0d2hpdGVCcmlnaHQ6IFs5NywgMzldLFxuXHR9LFxuXHRiZ0NvbG9yOiB7XG5cdFx0YmdCbGFjazogWzQwLCA0OV0sXG5cdFx0YmdSZWQ6IFs0MSwgNDldLFxuXHRcdGJnR3JlZW46IFs0MiwgNDldLFxuXHRcdGJnWWVsbG93OiBbNDMsIDQ5XSxcblx0XHRiZ0JsdWU6IFs0NCwgNDldLFxuXHRcdGJnTWFnZW50YTogWzQ1LCA0OV0sXG5cdFx0YmdDeWFuOiBbNDYsIDQ5XSxcblx0XHRiZ1doaXRlOiBbNDcsIDQ5XSxcblxuXHRcdC8vIEJyaWdodCBjb2xvclxuXHRcdGJnQmxhY2tCcmlnaHQ6IFsxMDAsIDQ5XSxcblx0XHRiZ0dyYXk6IFsxMDAsIDQ5XSwgLy8gQWxpYXMgb2YgYGJnQmxhY2tCcmlnaHRgXG5cdFx0YmdHcmV5OiBbMTAwLCA0OV0sIC8vIEFsaWFzIG9mIGBiZ0JsYWNrQnJpZ2h0YFxuXHRcdGJnUmVkQnJpZ2h0OiBbMTAxLCA0OV0sXG5cdFx0YmdHcmVlbkJyaWdodDogWzEwMiwgNDldLFxuXHRcdGJnWWVsbG93QnJpZ2h0OiBbMTAzLCA0OV0sXG5cdFx0YmdCbHVlQnJpZ2h0OiBbMTA0LCA0OV0sXG5cdFx0YmdNYWdlbnRhQnJpZ2h0OiBbMTA1LCA0OV0sXG5cdFx0YmdDeWFuQnJpZ2h0OiBbMTA2LCA0OV0sXG5cdFx0YmdXaGl0ZUJyaWdodDogWzEwNywgNDldLFxuXHR9LFxufTtcblxuZXhwb3J0IGNvbnN0IG1vZGlmaWVyTmFtZXMgPSBPYmplY3Qua2V5cyhzdHlsZXMubW9kaWZpZXIpO1xuZXhwb3J0IGNvbnN0IGZvcmVncm91bmRDb2xvck5hbWVzID0gT2JqZWN0LmtleXMoc3R5bGVzLmNvbG9yKTtcbmV4cG9ydCBjb25zdCBiYWNrZ3JvdW5kQ29sb3JOYW1lcyA9IE9iamVjdC5rZXlzKHN0eWxlcy5iZ0NvbG9yKTtcbmV4cG9ydCBjb25zdCBjb2xvck5hbWVzID0gWy4uLmZvcmVncm91bmRDb2xvck5hbWVzLCAuLi5iYWNrZ3JvdW5kQ29sb3JOYW1lc107XG5cbmZ1bmN0aW9uIGFzc2VtYmxlU3R5bGVzKCkge1xuXHRjb25zdCBjb2RlcyA9IG5ldyBNYXAoKTtcblxuXHRmb3IgKGNvbnN0IFtncm91cE5hbWUsIGdyb3VwXSBvZiBPYmplY3QuZW50cmllcyhzdHlsZXMpKSB7XG5cdFx0Zm9yIChjb25zdCBbc3R5bGVOYW1lLCBzdHlsZV0gb2YgT2JqZWN0LmVudHJpZXMoZ3JvdXApKSB7XG5cdFx0XHRzdHlsZXNbc3R5bGVOYW1lXSA9IHtcblx0XHRcdFx0b3BlbjogYFxcdTAwMUJbJHtzdHlsZVswXX1tYCxcblx0XHRcdFx0Y2xvc2U6IGBcXHUwMDFCWyR7c3R5bGVbMV19bWAsXG5cdFx0XHR9O1xuXG5cdFx0XHRncm91cFtzdHlsZU5hbWVdID0gc3R5bGVzW3N0eWxlTmFtZV07XG5cblx0XHRcdGNvZGVzLnNldChzdHlsZVswXSwgc3R5bGVbMV0pO1xuXHRcdH1cblxuXHRcdE9iamVjdC5kZWZpbmVQcm9wZXJ0eShzdHlsZXMsIGdyb3VwTmFtZSwge1xuXHRcdFx0dmFsdWU6IGdyb3VwLFxuXHRcdFx0ZW51bWVyYWJsZTogZmFsc2UsXG5cdFx0fSk7XG5cdH1cblxuXHRPYmplY3QuZGVmaW5lUHJvcGVydHkoc3R5bGVzLCAnY29kZXMnLCB7XG5cdFx0dmFsdWU6IGNvZGVzLFxuXHRcdGVudW1lcmFibGU6IGZhbHNlLFxuXHR9KTtcblxuXHRzdHlsZXMuY29sb3IuY2xvc2UgPSAnXFx1MDAxQlszOW0nO1xuXHRzdHlsZXMuYmdDb2xvci5jbG9zZSA9ICdcXHUwMDFCWzQ5bSc7XG5cblx0c3R5bGVzLmNvbG9yLmFuc2kgPSB3cmFwQW5zaTE2KCk7XG5cdHN0eWxlcy5jb2xvci5hbnNpMjU2ID0gd3JhcEFuc2kyNTYoKTtcblx0c3R5bGVzLmNvbG9yLmFuc2kxNm0gPSB3cmFwQW5zaTE2bSgpO1xuXHRzdHlsZXMuYmdDb2xvci5hbnNpID0gd3JhcEFuc2kxNihBTlNJX0JBQ0tHUk9VTkRfT0ZGU0VUKTtcblx0c3R5bGVzLmJnQ29sb3IuYW5zaTI1NiA9IHdyYXBBbnNpMjU2KEFOU0lfQkFDS0dST1VORF9PRkZTRVQpO1xuXHRzdHlsZXMuYmdDb2xvci5hbnNpMTZtID0gd3JhcEFuc2kxNm0oQU5TSV9CQUNLR1JPVU5EX09GRlNFVCk7XG5cblx0Ly8gRnJvbSBodHRwczovL2dpdGh1Yi5jb20vUWl4LS9jb2xvci1jb252ZXJ0L2Jsb2IvM2YwZTBkNGU5MmUyMzU3OTZjY2IxN2Y2ZTg1YzcyMDk0YTY1MWY0OS9jb252ZXJzaW9ucy5qc1xuXHRPYmplY3QuZGVmaW5lUHJvcGVydGllcyhzdHlsZXMsIHtcblx0XHRyZ2JUb0Fuc2kyNTY6IHtcblx0XHRcdHZhbHVlKHJlZCwgZ3JlZW4sIGJsdWUpIHtcblx0XHRcdFx0Ly8gV2UgdXNlIHRoZSBleHRlbmRlZCBncmV5c2NhbGUgcGFsZXR0ZSBoZXJlLCB3aXRoIHRoZSBleGNlcHRpb24gb2Zcblx0XHRcdFx0Ly8gYmxhY2sgYW5kIHdoaXRlLiBub3JtYWwgcGFsZXR0ZSBvbmx5IGhhcyA0IGdyZXlzY2FsZSBzaGFkZXMuXG5cdFx0XHRcdGlmIChyZWQgPT09IGdyZWVuICYmIGdyZWVuID09PSBibHVlKSB7XG5cdFx0XHRcdFx0aWYgKHJlZCA8IDgpIHtcblx0XHRcdFx0XHRcdHJldHVybiAxNjtcblx0XHRcdFx0XHR9XG5cblx0XHRcdFx0XHRpZiAocmVkID4gMjQ4KSB7XG5cdFx0XHRcdFx0XHRyZXR1cm4gMjMxO1xuXHRcdFx0XHRcdH1cblxuXHRcdFx0XHRcdHJldHVybiBNYXRoLnJvdW5kKCgocmVkIC0gOCkgLyAyNDcpICogMjQpICsgMjMyO1xuXHRcdFx0XHR9XG5cblx0XHRcdFx0cmV0dXJuIDE2XG5cdFx0XHRcdFx0KyAoMzYgKiBNYXRoLnJvdW5kKHJlZCAvIDI1NSAqIDUpKVxuXHRcdFx0XHRcdCsgKDYgKiBNYXRoLnJvdW5kKGdyZWVuIC8gMjU1ICogNSkpXG5cdFx0XHRcdFx0KyBNYXRoLnJvdW5kKGJsdWUgLyAyNTUgKiA1KTtcblx0XHRcdH0sXG5cdFx0XHRlbnVtZXJhYmxlOiBmYWxzZSxcblx0XHR9LFxuXHRcdGhleFRvUmdiOiB7XG5cdFx0XHR2YWx1ZShoZXgpIHtcblx0XHRcdFx0Y29uc3QgbWF0Y2hlcyA9IC9bYS1mXFxkXXs2fXxbYS1mXFxkXXszfS9pLmV4ZWMoaGV4LnRvU3RyaW5nKDE2KSk7XG5cdFx0XHRcdGlmICghbWF0Y2hlcykge1xuXHRcdFx0XHRcdHJldHVybiBbMCwgMCwgMF07XG5cdFx0XHRcdH1cblxuXHRcdFx0XHRsZXQgW2NvbG9yU3RyaW5nXSA9IG1hdGNoZXM7XG5cblx0XHRcdFx0aWYgKGNvbG9yU3RyaW5nLmxlbmd0aCA9PT0gMykge1xuXHRcdFx0XHRcdGNvbG9yU3RyaW5nID0gWy4uLmNvbG9yU3RyaW5nXS5tYXAoY2hhcmFjdGVyID0+IGNoYXJhY3RlciArIGNoYXJhY3Rlcikuam9pbignJyk7XG5cdFx0XHRcdH1cblxuXHRcdFx0XHRjb25zdCBpbnRlZ2VyID0gTnVtYmVyLnBhcnNlSW50KGNvbG9yU3RyaW5nLCAxNik7XG5cblx0XHRcdFx0cmV0dXJuIFtcblx0XHRcdFx0XHQvKiBlc2xpbnQtZGlzYWJsZSBuby1iaXR3aXNlICovXG5cdFx0XHRcdFx0KGludGVnZXIgPj4gMTYpICYgMHhGRixcblx0XHRcdFx0XHQoaW50ZWdlciA+PiA4KSAmIDB4RkYsXG5cdFx0XHRcdFx0aW50ZWdlciAmIDB4RkYsXG5cdFx0XHRcdFx0LyogZXNsaW50LWVuYWJsZSBuby1iaXR3aXNlICovXG5cdFx0XHRcdF07XG5cdFx0XHR9LFxuXHRcdFx0ZW51bWVyYWJsZTogZmFsc2UsXG5cdFx0fSxcblx0XHRoZXhUb0Fuc2kyNTY6IHtcblx0XHRcdHZhbHVlOiBoZXggPT4gc3R5bGVzLnJnYlRvQW5zaTI1NiguLi5zdHlsZXMuaGV4VG9SZ2IoaGV4KSksXG5cdFx0XHRlbnVtZXJhYmxlOiBmYWxzZSxcblx0XHR9LFxuXHRcdGFuc2kyNTZUb0Fuc2k6IHtcblx0XHRcdHZhbHVlKGNvZGUpIHtcblx0XHRcdFx0aWYgKGNvZGUgPCA4KSB7XG5cdFx0XHRcdFx0cmV0dXJuIDMwICsgY29kZTtcblx0XHRcdFx0fVxuXG5cdFx0XHRcdGlmIChjb2RlIDwgMTYpIHtcblx0XHRcdFx0XHRyZXR1cm4gOTAgKyAoY29kZSAtIDgpO1xuXHRcdFx0XHR9XG5cblx0XHRcdFx0bGV0IHJlZDtcblx0XHRcdFx0bGV0IGdyZWVuO1xuXHRcdFx0XHRsZXQgYmx1ZTtcblxuXHRcdFx0XHRpZiAoY29kZSA+PSAyMzIpIHtcblx0XHRcdFx0XHRyZWQgPSAoKChjb2RlIC0gMjMyKSAqIDEwKSArIDgpIC8gMjU1O1xuXHRcdFx0XHRcdGdyZWVuID0gcmVkO1xuXHRcdFx0XHRcdGJsdWUgPSByZWQ7XG5cdFx0XHRcdH0gZWxzZSB7XG5cdFx0XHRcdFx0Y29kZSAtPSAxNjtcblxuXHRcdFx0XHRcdGNvbnN0IHJlbWFpbmRlciA9IGNvZGUgJSAzNjtcblxuXHRcdFx0XHRcdHJlZCA9IE1hdGguZmxvb3IoY29kZSAvIDM2KSAvIDU7XG5cdFx0XHRcdFx0Z3JlZW4gPSBNYXRoLmZsb29yKHJlbWFpbmRlciAvIDYpIC8gNTtcblx0XHRcdFx0XHRibHVlID0gKHJlbWFpbmRlciAlIDYpIC8gNTtcblx0XHRcdFx0fVxuXG5cdFx0XHRcdGNvbnN0IHZhbHVlID0gTWF0aC5tYXgocmVkLCBncmVlbiwgYmx1ZSkgKiAyO1xuXG5cdFx0XHRcdGlmICh2YWx1ZSA9PT0gMCkge1xuXHRcdFx0XHRcdHJldHVybiAzMDtcblx0XHRcdFx0fVxuXG5cdFx0XHRcdC8vIGVzbGludC1kaXNhYmxlLW5leHQtbGluZSBuby1iaXR3aXNlXG5cdFx0XHRcdGxldCByZXN1bHQgPSAzMCArICgoTWF0aC5yb3VuZChibHVlKSA8PCAyKSB8IChNYXRoLnJvdW5kKGdyZWVuKSA8PCAxKSB8IE1hdGgucm91bmQocmVkKSk7XG5cblx0XHRcdFx0aWYgKHZhbHVlID09PSAyKSB7XG5cdFx0XHRcdFx0cmVzdWx0ICs9IDYwO1xuXHRcdFx0XHR9XG5cblx0XHRcdFx0cmV0dXJuIHJlc3VsdDtcblx0XHRcdH0sXG5cdFx0XHRlbnVtZXJhYmxlOiBmYWxzZSxcblx0XHR9LFxuXHRcdHJnYlRvQW5zaToge1xuXHRcdFx0dmFsdWU6IChyZWQsIGdyZWVuLCBibHVlKSA9PiBzdHlsZXMuYW5zaTI1NlRvQW5zaShzdHlsZXMucmdiVG9BbnNpMjU2KHJlZCwgZ3JlZW4sIGJsdWUpKSxcblx0XHRcdGVudW1lcmFibGU6IGZhbHNlLFxuXHRcdH0sXG5cdFx0aGV4VG9BbnNpOiB7XG5cdFx0XHR2YWx1ZTogaGV4ID0+IHN0eWxlcy5hbnNpMjU2VG9BbnNpKHN0eWxlcy5oZXhUb0Fuc2kyNTYoaGV4KSksXG5cdFx0XHRlbnVtZXJhYmxlOiBmYWxzZSxcblx0XHR9LFxuXHR9KTtcblxuXHRyZXR1cm4gc3R5bGVzO1xufVxuXG5jb25zdCBhbnNpU3R5bGVzID0gYXNzZW1ibGVTdHlsZXMoKTtcblxuZXhwb3J0IGRlZmF1bHQgYW5zaVN0eWxlcztcbiIsImltcG9ydCBwcm9jZXNzIGZyb20gJ25vZGU6cHJvY2Vzcyc7XG5pbXBvcnQgb3MgZnJvbSAnbm9kZTpvcyc7XG5pbXBvcnQgdHR5IGZyb20gJ25vZGU6dHR5JztcblxuLy8gRnJvbTogaHR0cHM6Ly9naXRodWIuY29tL3NpbmRyZXNvcmh1cy9oYXMtZmxhZy9ibG9iL21haW4vaW5kZXguanNcbi8vLyBmdW5jdGlvbiBoYXNGbGFnKGZsYWcsIGFyZ3YgPSBnbG9iYWxUaGlzLkRlbm8/LmFyZ3MgPz8gcHJvY2Vzcy5hcmd2KSB7XG5mdW5jdGlvbiBoYXNGbGFnKGZsYWcsIGFyZ3YgPSBnbG9iYWxUaGlzLkRlbm8gPyBnbG9iYWxUaGlzLkRlbm8uYXJncyA6IHByb2Nlc3MuYXJndikge1xuXHRjb25zdCBwcmVmaXggPSBmbGFnLnN0YXJ0c1dpdGgoJy0nKSA/ICcnIDogKGZsYWcubGVuZ3RoID09PSAxID8gJy0nIDogJy0tJyk7XG5cdGNvbnN0IHBvc2l0aW9uID0gYXJndi5pbmRleE9mKHByZWZpeCArIGZsYWcpO1xuXHRjb25zdCB0ZXJtaW5hdG9yUG9zaXRpb24gPSBhcmd2LmluZGV4T2YoJy0tJyk7XG5cdHJldHVybiBwb3NpdGlvbiAhPT0gLTEgJiYgKHRlcm1pbmF0b3JQb3NpdGlvbiA9PT0gLTEgfHwgcG9zaXRpb24gPCB0ZXJtaW5hdG9yUG9zaXRpb24pO1xufVxuXG5jb25zdCB7ZW52fSA9IHByb2Nlc3M7XG5cbmxldCBmbGFnRm9yY2VDb2xvcjtcbmlmIChcblx0aGFzRmxhZygnbm8tY29sb3InKVxuXHR8fCBoYXNGbGFnKCduby1jb2xvcnMnKVxuXHR8fCBoYXNGbGFnKCdjb2xvcj1mYWxzZScpXG5cdHx8IGhhc0ZsYWcoJ2NvbG9yPW5ldmVyJylcbikge1xuXHRmbGFnRm9yY2VDb2xvciA9IDA7XG59IGVsc2UgaWYgKFxuXHRoYXNGbGFnKCdjb2xvcicpXG5cdHx8IGhhc0ZsYWcoJ2NvbG9ycycpXG5cdHx8IGhhc0ZsYWcoJ2NvbG9yPXRydWUnKVxuXHR8fCBoYXNGbGFnKCdjb2xvcj1hbHdheXMnKVxuKSB7XG5cdGZsYWdGb3JjZUNvbG9yID0gMTtcbn1cblxuZnVuY3Rpb24gZW52Rm9yY2VDb2xvcigpIHtcblx0aWYgKCdGT1JDRV9DT0xPUicgaW4gZW52KSB7XG5cdFx0aWYgKGVudi5GT1JDRV9DT0xPUiA9PT0gJ3RydWUnKSB7XG5cdFx0XHRyZXR1cm4gMTtcblx0XHR9XG5cblx0XHRpZiAoZW52LkZPUkNFX0NPTE9SID09PSAnZmFsc2UnKSB7XG5cdFx0XHRyZXR1cm4gMDtcblx0XHR9XG5cblx0XHRyZXR1cm4gZW52LkZPUkNFX0NPTE9SLmxlbmd0aCA9PT0gMCA/IDEgOiBNYXRoLm1pbihOdW1iZXIucGFyc2VJbnQoZW52LkZPUkNFX0NPTE9SLCAxMCksIDMpO1xuXHR9XG59XG5cbmZ1bmN0aW9uIHRyYW5zbGF0ZUxldmVsKGxldmVsKSB7XG5cdGlmIChsZXZlbCA9PT0gMCkge1xuXHRcdHJldHVybiBmYWxzZTtcblx0fVxuXG5cdHJldHVybiB7XG5cdFx0bGV2ZWwsXG5cdFx0aGFzQmFzaWM6IHRydWUsXG5cdFx0aGFzMjU2OiBsZXZlbCA+PSAyLFxuXHRcdGhhczE2bTogbGV2ZWwgPj0gMyxcblx0fTtcbn1cblxuZnVuY3Rpb24gX3N1cHBvcnRzQ29sb3IoaGF2ZVN0cmVhbSwge3N0cmVhbUlzVFRZLCBzbmlmZkZsYWdzID0gdHJ1ZX0gPSB7fSkge1xuXHRjb25zdCBub0ZsYWdGb3JjZUNvbG9yID0gZW52Rm9yY2VDb2xvcigpO1xuXHRpZiAobm9GbGFnRm9yY2VDb2xvciAhPT0gdW5kZWZpbmVkKSB7XG5cdFx0ZmxhZ0ZvcmNlQ29sb3IgPSBub0ZsYWdGb3JjZUNvbG9yO1xuXHR9XG5cblx0Y29uc3QgZm9yY2VDb2xvciA9IHNuaWZmRmxhZ3MgPyBmbGFnRm9yY2VDb2xvciA6IG5vRmxhZ0ZvcmNlQ29sb3I7XG5cblx0aWYgKGZvcmNlQ29sb3IgPT09IDApIHtcblx0XHRyZXR1cm4gMDtcblx0fVxuXG5cdGlmIChzbmlmZkZsYWdzKSB7XG5cdFx0aWYgKGhhc0ZsYWcoJ2NvbG9yPTE2bScpXG5cdFx0XHR8fCBoYXNGbGFnKCdjb2xvcj1mdWxsJylcblx0XHRcdHx8IGhhc0ZsYWcoJ2NvbG9yPXRydWVjb2xvcicpKSB7XG5cdFx0XHRyZXR1cm4gMztcblx0XHR9XG5cblx0XHRpZiAoaGFzRmxhZygnY29sb3I9MjU2JykpIHtcblx0XHRcdHJldHVybiAyO1xuXHRcdH1cblx0fVxuXG5cdC8vIENoZWNrIGZvciBBenVyZSBEZXZPcHMgcGlwZWxpbmVzLlxuXHQvLyBIYXMgdG8gYmUgYWJvdmUgdGhlIGAhc3RyZWFtSXNUVFlgIGNoZWNrLlxuXHRpZiAoJ1RGX0JVSUxEJyBpbiBlbnYgJiYgJ0FHRU5UX05BTUUnIGluIGVudikge1xuXHRcdHJldHVybiAxO1xuXHR9XG5cblx0aWYgKGhhdmVTdHJlYW0gJiYgIXN0cmVhbUlzVFRZICYmIGZvcmNlQ29sb3IgPT09IHVuZGVmaW5lZCkge1xuXHRcdHJldHVybiAwO1xuXHR9XG5cblx0Y29uc3QgbWluID0gZm9yY2VDb2xvciB8fCAwO1xuXG5cdGlmIChlbnYuVEVSTSA9PT0gJ2R1bWInKSB7XG5cdFx0cmV0dXJuIG1pbjtcblx0fVxuXG5cdGlmIChwcm9jZXNzLnBsYXRmb3JtID09PSAnd2luMzInKSB7XG5cdFx0Ly8gV2luZG93cyAxMCBidWlsZCAxMDU4NiBpcyB0aGUgZmlyc3QgV2luZG93cyByZWxlYXNlIHRoYXQgc3VwcG9ydHMgMjU2IGNvbG9ycy5cblx0XHQvLyBXaW5kb3dzIDEwIGJ1aWxkIDE0OTMxIGlzIHRoZSBmaXJzdCByZWxlYXNlIHRoYXQgc3VwcG9ydHMgMTZtL1RydWVDb2xvci5cblx0XHRjb25zdCBvc1JlbGVhc2UgPSBvcy5yZWxlYXNlKCkuc3BsaXQoJy4nKTtcblx0XHRpZiAoXG5cdFx0XHROdW1iZXIob3NSZWxlYXNlWzBdKSA+PSAxMFxuXHRcdFx0JiYgTnVtYmVyKG9zUmVsZWFzZVsyXSkgPj0gMTBfNTg2XG5cdFx0KSB7XG5cdFx0XHRyZXR1cm4gTnVtYmVyKG9zUmVsZWFzZVsyXSkgPj0gMTRfOTMxID8gMyA6IDI7XG5cdFx0fVxuXG5cdFx0cmV0dXJuIDE7XG5cdH1cblxuXHRpZiAoJ0NJJyBpbiBlbnYpIHtcblx0XHRpZiAoJ0dJVEhVQl9BQ1RJT05TJyBpbiBlbnYgfHwgJ0dJVEVBX0FDVElPTlMnIGluIGVudikge1xuXHRcdFx0cmV0dXJuIDM7XG5cdFx0fVxuXG5cdFx0aWYgKFsnVFJBVklTJywgJ0NJUkNMRUNJJywgJ0FQUFZFWU9SJywgJ0dJVExBQl9DSScsICdCVUlMREtJVEUnLCAnRFJPTkUnXS5zb21lKHNpZ24gPT4gc2lnbiBpbiBlbnYpIHx8IGVudi5DSV9OQU1FID09PSAnY29kZXNoaXAnKSB7XG5cdFx0XHRyZXR1cm4gMTtcblx0XHR9XG5cblx0XHRyZXR1cm4gbWluO1xuXHR9XG5cblx0aWYgKCdURUFNQ0lUWV9WRVJTSU9OJyBpbiBlbnYpIHtcblx0XHRyZXR1cm4gL14oOVxcLigwKlsxLTldXFxkKilcXC58XFxkezIsfVxcLikvLnRlc3QoZW52LlRFQU1DSVRZX1ZFUlNJT04pID8gMSA6IDA7XG5cdH1cblxuXHRpZiAoZW52LkNPTE9SVEVSTSA9PT0gJ3RydWVjb2xvcicpIHtcblx0XHRyZXR1cm4gMztcblx0fVxuXG5cdGlmIChlbnYuVEVSTSA9PT0gJ3h0ZXJtLWtpdHR5Jykge1xuXHRcdHJldHVybiAzO1xuXHR9XG5cblx0aWYgKCdURVJNX1BST0dSQU0nIGluIGVudikge1xuXHRcdGNvbnN0IHZlcnNpb24gPSBOdW1iZXIucGFyc2VJbnQoKGVudi5URVJNX1BST0dSQU1fVkVSU0lPTiB8fCAnJykuc3BsaXQoJy4nKVswXSwgMTApO1xuXG5cdFx0c3dpdGNoIChlbnYuVEVSTV9QUk9HUkFNKSB7XG5cdFx0XHRjYXNlICdpVGVybS5hcHAnOiB7XG5cdFx0XHRcdHJldHVybiB2ZXJzaW9uID49IDMgPyAzIDogMjtcblx0XHRcdH1cblxuXHRcdFx0Y2FzZSAnQXBwbGVfVGVybWluYWwnOiB7XG5cdFx0XHRcdHJldHVybiAyO1xuXHRcdFx0fVxuXHRcdFx0Ly8gTm8gZGVmYXVsdFxuXHRcdH1cblx0fVxuXG5cdGlmICgvLTI1Nihjb2xvcik/JC9pLnRlc3QoZW52LlRFUk0pKSB7XG5cdFx0cmV0dXJuIDI7XG5cdH1cblxuXHRpZiAoL15zY3JlZW58Xnh0ZXJtfF52dDEwMHxednQyMjB8XnJ4dnR8Y29sb3J8YW5zaXxjeWd3aW58bGludXgvaS50ZXN0KGVudi5URVJNKSkge1xuXHRcdHJldHVybiAxO1xuXHR9XG5cblx0aWYgKCdDT0xPUlRFUk0nIGluIGVudikge1xuXHRcdHJldHVybiAxO1xuXHR9XG5cblx0cmV0dXJuIG1pbjtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIGNyZWF0ZVN1cHBvcnRzQ29sb3Ioc3RyZWFtLCBvcHRpb25zID0ge30pIHtcblx0Y29uc3QgbGV2ZWwgPSBfc3VwcG9ydHNDb2xvcihzdHJlYW0sIHtcblx0XHRzdHJlYW1Jc1RUWTogc3RyZWFtICYmIHN0cmVhbS5pc1RUWSxcblx0XHQuLi5vcHRpb25zLFxuXHR9KTtcblxuXHRyZXR1cm4gdHJhbnNsYXRlTGV2ZWwobGV2ZWwpO1xufVxuXG5jb25zdCBzdXBwb3J0c0NvbG9yID0ge1xuXHRzdGRvdXQ6IGNyZWF0ZVN1cHBvcnRzQ29sb3Ioe2lzVFRZOiB0dHkuaXNhdHR5KDEpfSksXG5cdHN0ZGVycjogY3JlYXRlU3VwcG9ydHNDb2xvcih7aXNUVFk6IHR0eS5pc2F0dHkoMil9KSxcbn07XG5cbmV4cG9ydCBkZWZhdWx0IHN1cHBvcnRzQ29sb3I7XG4iLCJjb25zdCBzaW5nbGVDb21tZW50ID0gU3ltYm9sKCdzaW5nbGVDb21tZW50Jyk7XG5jb25zdCBtdWx0aUNvbW1lbnQgPSBTeW1ib2woJ211bHRpQ29tbWVudCcpO1xuXG5jb25zdCBzdHJpcFdpdGhvdXRXaGl0ZXNwYWNlID0gKCkgPT4gJyc7XG5jb25zdCBzdHJpcFdpdGhXaGl0ZXNwYWNlID0gKHN0cmluZywgc3RhcnQsIGVuZCkgPT4gc3RyaW5nLnNsaWNlKHN0YXJ0LCBlbmQpLnJlcGxhY2UoL1xcUy9nLCAnICcpO1xuXG5jb25zdCBpc0VzY2FwZWQgPSAoanNvblN0cmluZywgcXVvdGVQb3NpdGlvbikgPT4ge1xuXHRsZXQgaW5kZXggPSBxdW90ZVBvc2l0aW9uIC0gMTtcblx0bGV0IGJhY2tzbGFzaENvdW50ID0gMDtcblxuXHR3aGlsZSAoanNvblN0cmluZ1tpbmRleF0gPT09ICdcXFxcJykge1xuXHRcdGluZGV4IC09IDE7XG5cdFx0YmFja3NsYXNoQ291bnQgKz0gMTtcblx0fVxuXG5cdHJldHVybiBCb29sZWFuKGJhY2tzbGFzaENvdW50ICUgMik7XG59O1xuXG5leHBvcnQgZGVmYXVsdCBmdW5jdGlvbiBzdHJpcEpzb25Db21tZW50cyhqc29uU3RyaW5nLCB7d2hpdGVzcGFjZSA9IHRydWUsIHRyYWlsaW5nQ29tbWFzID0gZmFsc2V9ID0ge30pIHtcblx0aWYgKHR5cGVvZiBqc29uU3RyaW5nICE9PSAnc3RyaW5nJykge1xuXHRcdHRocm93IG5ldyBUeXBlRXJyb3IoYEV4cGVjdGVkIGFyZ3VtZW50IFxcYGpzb25TdHJpbmdcXGAgdG8gYmUgYSBcXGBzdHJpbmdcXGAsIGdvdCBcXGAke3R5cGVvZiBqc29uU3RyaW5nfVxcYGApO1xuXHR9XG5cblx0Y29uc3Qgc3RyaXAgPSB3aGl0ZXNwYWNlID8gc3RyaXBXaXRoV2hpdGVzcGFjZSA6IHN0cmlwV2l0aG91dFdoaXRlc3BhY2U7XG5cblx0bGV0IGlzSW5zaWRlU3RyaW5nID0gZmFsc2U7XG5cdGxldCBpc0luc2lkZUNvbW1lbnQgPSBmYWxzZTtcblx0bGV0IG9mZnNldCA9IDA7XG5cdGxldCBidWZmZXIgPSAnJztcblx0bGV0IHJlc3VsdCA9ICcnO1xuXHRsZXQgY29tbWFJbmRleCA9IC0xO1xuXG5cdGZvciAobGV0IGluZGV4ID0gMDsgaW5kZXggPCBqc29uU3RyaW5nLmxlbmd0aDsgaW5kZXgrKykge1xuXHRcdGNvbnN0IGN1cnJlbnRDaGFyYWN0ZXIgPSBqc29uU3RyaW5nW2luZGV4XTtcblx0XHRjb25zdCBuZXh0Q2hhcmFjdGVyID0ganNvblN0cmluZ1tpbmRleCArIDFdO1xuXG5cdFx0aWYgKCFpc0luc2lkZUNvbW1lbnQgJiYgY3VycmVudENoYXJhY3RlciA9PT0gJ1wiJykge1xuXHRcdFx0Ly8gRW50ZXIgb3IgZXhpdCBzdHJpbmdcblx0XHRcdGNvbnN0IGVzY2FwZWQgPSBpc0VzY2FwZWQoanNvblN0cmluZywgaW5kZXgpO1xuXHRcdFx0aWYgKCFlc2NhcGVkKSB7XG5cdFx0XHRcdGlzSW5zaWRlU3RyaW5nID0gIWlzSW5zaWRlU3RyaW5nO1xuXHRcdFx0fVxuXHRcdH1cblxuXHRcdGlmIChpc0luc2lkZVN0cmluZykge1xuXHRcdFx0Y29udGludWU7XG5cdFx0fVxuXG5cdFx0aWYgKCFpc0luc2lkZUNvbW1lbnQgJiYgY3VycmVudENoYXJhY3RlciArIG5leHRDaGFyYWN0ZXIgPT09ICcvLycpIHtcblx0XHRcdC8vIEVudGVyIHNpbmdsZS1saW5lIGNvbW1lbnRcblx0XHRcdGJ1ZmZlciArPSBqc29uU3RyaW5nLnNsaWNlKG9mZnNldCwgaW5kZXgpO1xuXHRcdFx0b2Zmc2V0ID0gaW5kZXg7XG5cdFx0XHRpc0luc2lkZUNvbW1lbnQgPSBzaW5nbGVDb21tZW50O1xuXHRcdFx0aW5kZXgrKztcblx0XHR9IGVsc2UgaWYgKGlzSW5zaWRlQ29tbWVudCA9PT0gc2luZ2xlQ29tbWVudCAmJiBjdXJyZW50Q2hhcmFjdGVyICsgbmV4dENoYXJhY3RlciA9PT0gJ1xcclxcbicpIHtcblx0XHRcdC8vIEV4aXQgc2luZ2xlLWxpbmUgY29tbWVudCB2aWEgXFxyXFxuXG5cdFx0XHRpbmRleCsrO1xuXHRcdFx0aXNJbnNpZGVDb21tZW50ID0gZmFsc2U7XG5cdFx0XHRidWZmZXIgKz0gc3RyaXAoanNvblN0cmluZywgb2Zmc2V0LCBpbmRleCk7XG5cdFx0XHRvZmZzZXQgPSBpbmRleDtcblx0XHRcdGNvbnRpbnVlO1xuXHRcdH0gZWxzZSBpZiAoaXNJbnNpZGVDb21tZW50ID09PSBzaW5nbGVDb21tZW50ICYmIGN1cnJlbnRDaGFyYWN0ZXIgPT09ICdcXG4nKSB7XG5cdFx0XHQvLyBFeGl0IHNpbmdsZS1saW5lIGNvbW1lbnQgdmlhIFxcblxuXHRcdFx0aXNJbnNpZGVDb21tZW50ID0gZmFsc2U7XG5cdFx0XHRidWZmZXIgKz0gc3RyaXAoanNvblN0cmluZywgb2Zmc2V0LCBpbmRleCk7XG5cdFx0XHRvZmZzZXQgPSBpbmRleDtcblx0XHR9IGVsc2UgaWYgKCFpc0luc2lkZUNvbW1lbnQgJiYgY3VycmVudENoYXJhY3RlciArIG5leHRDaGFyYWN0ZXIgPT09ICcvKicpIHtcblx0XHRcdC8vIEVudGVyIG11bHRpbGluZSBjb21tZW50XG5cdFx0XHRidWZmZXIgKz0ganNvblN0cmluZy5zbGljZShvZmZzZXQsIGluZGV4KTtcblx0XHRcdG9mZnNldCA9IGluZGV4O1xuXHRcdFx0aXNJbnNpZGVDb21tZW50ID0gbXVsdGlDb21tZW50O1xuXHRcdFx0aW5kZXgrKztcblx0XHRcdGNvbnRpbnVlO1xuXHRcdH0gZWxzZSBpZiAoaXNJbnNpZGVDb21tZW50ID09PSBtdWx0aUNvbW1lbnQgJiYgY3VycmVudENoYXJhY3RlciArIG5leHRDaGFyYWN0ZXIgPT09ICcqLycpIHtcblx0XHRcdC8vIEV4aXQgbXVsdGlsaW5lIGNvbW1lbnRcblx0XHRcdGluZGV4Kys7XG5cdFx0XHRpc0luc2lkZUNvbW1lbnQgPSBmYWxzZTtcblx0XHRcdGJ1ZmZlciArPSBzdHJpcChqc29uU3RyaW5nLCBvZmZzZXQsIGluZGV4ICsgMSk7XG5cdFx0XHRvZmZzZXQgPSBpbmRleCArIDE7XG5cdFx0XHRjb250aW51ZTtcblx0XHR9IGVsc2UgaWYgKHRyYWlsaW5nQ29tbWFzICYmICFpc0luc2lkZUNvbW1lbnQpIHtcblx0XHRcdGlmIChjb21tYUluZGV4ICE9PSAtMSkge1xuXHRcdFx0XHRpZiAoY3VycmVudENoYXJhY3RlciA9PT0gJ30nIHx8IGN1cnJlbnRDaGFyYWN0ZXIgPT09ICddJykge1xuXHRcdFx0XHRcdC8vIFN0cmlwIHRyYWlsaW5nIGNvbW1hXG5cdFx0XHRcdFx0YnVmZmVyICs9IGpzb25TdHJpbmcuc2xpY2Uob2Zmc2V0LCBpbmRleCk7XG5cdFx0XHRcdFx0cmVzdWx0ICs9IHN0cmlwKGJ1ZmZlciwgMCwgMSkgKyBidWZmZXIuc2xpY2UoMSk7XG5cdFx0XHRcdFx0YnVmZmVyID0gJyc7XG5cdFx0XHRcdFx0b2Zmc2V0ID0gaW5kZXg7XG5cdFx0XHRcdFx0Y29tbWFJbmRleCA9IC0xO1xuXHRcdFx0XHR9IGVsc2UgaWYgKGN1cnJlbnRDaGFyYWN0ZXIgIT09ICcgJyAmJiBjdXJyZW50Q2hhcmFjdGVyICE9PSAnXFx0JyAmJiBjdXJyZW50Q2hhcmFjdGVyICE9PSAnXFxyJyAmJiBjdXJyZW50Q2hhcmFjdGVyICE9PSAnXFxuJykge1xuXHRcdFx0XHRcdC8vIEhpdCBub24td2hpdGVzcGFjZSBmb2xsb3dpbmcgYSBjb21tYTsgY29tbWEgaXMgbm90IHRyYWlsaW5nXG5cdFx0XHRcdFx0YnVmZmVyICs9IGpzb25TdHJpbmcuc2xpY2Uob2Zmc2V0LCBpbmRleCk7XG5cdFx0XHRcdFx0b2Zmc2V0ID0gaW5kZXg7XG5cdFx0XHRcdFx0Y29tbWFJbmRleCA9IC0xO1xuXHRcdFx0XHR9XG5cdFx0XHR9IGVsc2UgaWYgKGN1cnJlbnRDaGFyYWN0ZXIgPT09ICcsJykge1xuXHRcdFx0XHQvLyBGbHVzaCBidWZmZXIgcHJpb3IgdG8gdGhpcyBwb2ludCwgYW5kIHNhdmUgbmV3IGNvbW1hIGluZGV4XG5cdFx0XHRcdHJlc3VsdCArPSBidWZmZXIgKyBqc29uU3RyaW5nLnNsaWNlKG9mZnNldCwgaW5kZXgpO1xuXHRcdFx0XHRidWZmZXIgPSAnJztcblx0XHRcdFx0b2Zmc2V0ID0gaW5kZXg7XG5cdFx0XHRcdGNvbW1hSW5kZXggPSBpbmRleDtcblx0XHRcdH1cblx0XHR9XG5cdH1cblxuXHRyZXR1cm4gcmVzdWx0ICsgYnVmZmVyICsgKGlzSW5zaWRlQ29tbWVudCA/IHN0cmlwKGpzb25TdHJpbmcuc2xpY2Uob2Zmc2V0KSkgOiBqc29uU3RyaW5nLnNsaWNlKG9mZnNldCkpO1xufVxuIiwiLy8gVGhlIG1vZHVsZSBjYWNoZVxudmFyIF9fd2VicGFja19tb2R1bGVfY2FjaGVfXyA9IHt9O1xuXG4vLyBUaGUgcmVxdWlyZSBmdW5jdGlvblxuZnVuY3Rpb24gX193ZWJwYWNrX3JlcXVpcmVfXyhtb2R1bGVJZCkge1xuXHQvLyBDaGVjayBpZiBtb2R1bGUgaXMgaW4gY2FjaGVcblx0dmFyIGNhY2hlZE1vZHVsZSA9IF9fd2VicGFja19tb2R1bGVfY2FjaGVfX1ttb2R1bGVJZF07XG5cdGlmIChjYWNoZWRNb2R1bGUgIT09IHVuZGVmaW5lZCkge1xuXHRcdHJldHVybiBjYWNoZWRNb2R1bGUuZXhwb3J0cztcblx0fVxuXHQvLyBDcmVhdGUgYSBuZXcgbW9kdWxlIChhbmQgcHV0IGl0IGludG8gdGhlIGNhY2hlKVxuXHR2YXIgbW9kdWxlID0gX193ZWJwYWNrX21vZHVsZV9jYWNoZV9fW21vZHVsZUlkXSA9IHtcblx0XHQvLyBubyBtb2R1bGUuaWQgbmVlZGVkXG5cdFx0Ly8gbm8gbW9kdWxlLmxvYWRlZCBuZWVkZWRcblx0XHRleHBvcnRzOiB7fVxuXHR9O1xuXG5cdC8vIEV4ZWN1dGUgdGhlIG1vZHVsZSBmdW5jdGlvblxuXHRfX3dlYnBhY2tfbW9kdWxlc19fW21vZHVsZUlkXShtb2R1bGUsIG1vZHVsZS5leHBvcnRzLCBfX3dlYnBhY2tfcmVxdWlyZV9fKTtcblxuXHQvLyBSZXR1cm4gdGhlIGV4cG9ydHMgb2YgdGhlIG1vZHVsZVxuXHRyZXR1cm4gbW9kdWxlLmV4cG9ydHM7XG59XG5cbiIsIi8vIGRlZmluZSBnZXR0ZXIgZnVuY3Rpb25zIGZvciBoYXJtb255IGV4cG9ydHNcbl9fd2VicGFja19yZXF1aXJlX18uZCA9IChleHBvcnRzLCBkZWZpbml0aW9uKSA9PiB7XG5cdGZvcih2YXIga2V5IGluIGRlZmluaXRpb24pIHtcblx0XHRpZihfX3dlYnBhY2tfcmVxdWlyZV9fLm8oZGVmaW5pdGlvbiwga2V5KSAmJiAhX193ZWJwYWNrX3JlcXVpcmVfXy5vKGV4cG9ydHMsIGtleSkpIHtcblx0XHRcdE9iamVjdC5kZWZpbmVQcm9wZXJ0eShleHBvcnRzLCBrZXksIHsgZW51bWVyYWJsZTogdHJ1ZSwgZ2V0OiBkZWZpbml0aW9uW2tleV0gfSk7XG5cdFx0fVxuXHR9XG59OyIsIl9fd2VicGFja19yZXF1aXJlX18ubyA9IChvYmosIHByb3ApID0+IChPYmplY3QucHJvdG90eXBlLmhhc093blByb3BlcnR5LmNhbGwob2JqLCBwcm9wKSkiLCIvLyBkZWZpbmUgX19lc01vZHVsZSBvbiBleHBvcnRzXG5fX3dlYnBhY2tfcmVxdWlyZV9fLnIgPSAoZXhwb3J0cykgPT4ge1xuXHRpZih0eXBlb2YgU3ltYm9sICE9PSAndW5kZWZpbmVkJyAmJiBTeW1ib2wudG9TdHJpbmdUYWcpIHtcblx0XHRPYmplY3QuZGVmaW5lUHJvcGVydHkoZXhwb3J0cywgU3ltYm9sLnRvU3RyaW5nVGFnLCB7IHZhbHVlOiAnTW9kdWxlJyB9KTtcblx0fVxuXHRPYmplY3QuZGVmaW5lUHJvcGVydHkoZXhwb3J0cywgJ19fZXNNb2R1bGUnLCB7IHZhbHVlOiB0cnVlIH0pO1xufTsiLCIjIS91c3IvYmluL2VudiBub2RlXG5cInVzZSBzdHJpY3RcIjtcbk9iamVjdC5kZWZpbmVQcm9wZXJ0eShleHBvcnRzLCBcIl9fZXNNb2R1bGVcIiwgeyB2YWx1ZTogdHJ1ZSB9KTtcbnZhciBmaWdsZXQgPSByZXF1aXJlKFwiZmlnbGV0XCIpO1xudmFyIGNvbW1hbmRlcl8xID0gcmVxdWlyZShcImNvbW1hbmRlclwiKTtcbnZhciB1dGlsXzEgPSByZXF1aXJlKFwiLi91dGlsL1wiKTtcbmNvbnNvbGUubG9nKGZpZ2xldC50ZXh0U3luYygnVlNDb2RlIExhdW5jaGVyJykpO1xudmFyIHByb2dyYW0gPSBuZXcgY29tbWFuZGVyXzEuQ29tbWFuZCgpO1xucHJvZ3JhbS52ZXJzaW9uKCcwLjAuMScpXG4gICAgLm9wdGlvbignLS1jd2QgW2N3ZF0nLCAnVGhlIGN1cnJlbnQgd29ya2luZyBkaXJlY3RvcnkgdG8gdXNlJywgcHJvY2Vzcy5jd2QoKSlcbiAgICAub3B0aW9uKCctYywgLS1jb25maWd1cmF0aW9uLW5hbWUgPGNvbmZpZ3VyYXRpb24+JywgJ1RoZSBuYW1lIG9mIHRoZSBjb25maWd1cmF0aW9uIHRvIGxhdW5jaCcpXG4gICAgLm9wdGlvbignLWQsIC0tZGVidWcnLCAnb3V0cHV0IGV4dHJhIGRlYnVnZ2luZycpXG4gICAgLm9wdGlvbignLWwsIC0tbGF1bmNoRmlsZSBbbGF1bmNoLWZpbGVdJywgJ1RoZSBwYXRoIHRvIHRoZSBsYXVuY2guanNvbiBmaWxlJywgJy52c2NvZGUvbGF1bmNoLmpzb24nKVxuICAgIC5kZXNjcmlwdGlvbignUnVuIGEgbGF1bmNoIGNvbmZpZ3VyYXRpb24gZnJvbSAudnNjb2RlL2xhdW5jaC5qc29uJylcbiAgICAucGFyc2UocHJvY2Vzcy5hcmd2KTtcbnZhciBvcHRpb25zID0gcHJvZ3JhbS5vcHRzKCk7XG5vcHRpb25zLmRlYnVnICYmIGNvbnNvbGUuZGVidWcoXCJMYXVuY2hpbmcgd2l0aCBvcHRpb25zOiBcIi5jb25jYXQoSlNPTi5zdHJpbmdpZnkob3B0aW9ucykpKTtcbnZhciBsYXVuY2hGaWxlID0gKDAsIHV0aWxfMS5yZWFkSnNvbkZpbGUpKG9wdGlvbnMubGF1bmNoRmlsZSk7XG4oMCwgdXRpbF8xLmxhdW5jaCkobGF1bmNoRmlsZSwgb3B0aW9ucy5jb25maWd1cmF0aW9uTmFtZSk7XG4iXSwibmFtZXMiOltdLCJzb3VyY2VSb290IjoiIn0=