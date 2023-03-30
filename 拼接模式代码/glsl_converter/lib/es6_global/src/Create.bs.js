

import * as Fs from "fs";
import * as List from "../../../../../node_modules/rescript/lib/es6/list.js";
import * as Glob from "glob";
import * as Curry from "../../../../../node_modules/rescript/lib/es6/curry.js";
import * as Js_array from "../../../../../node_modules/rescript/lib/es6/js_array.js";
import * as Parse$Glsl_converter from "./Parse.bs.js";
import * as ArrayUtils$Glsl_converter from "./ArrayUtils.bs.js";

var _functionContentForTs = "\n  let _buildChunk =\n      (\n        [ top, define ]:[string, string],\n        varDeclare: string,\n        [ funcDeclare, funcDefine ]:[string, string],\n        body: string\n      ) => {\n    return {\n      top,\n      define,\n      varDeclare,\n      funcDeclare,\n      funcDefine,\n      body\n    }\n  };\n\n  export let getData = () =>{\n  ";

function _buildInitDataContentForTs(glslContent) {
  return "\n        return {\n          " + glslContent + "\n        }\n  ";
}

var _functionContentForRes = "\n  open Glsl_converter.ChunkType\n\n\n  let _buildChunk =\n      (\n        ( top:string, define:string ),\n        varDeclare: string,\n        ( funcDeclare:string, funcDefine:string ),\n        body: string\n      ) => {\n    {\n      top,\n      define,\n      varDeclare,\n      funcDeclare,\n      funcDefine,\n      body\n    }\n  };\n\n  let getData = () =>{\n  ";

function _buildInitDataContentForRes(glslContent) {
  return "\n          " + glslContent + "\n  ";
}

function _buildChunkFileContent(param, glslContent) {
  return param[1] + Curry._1(param[0], glslContent) + "}";
}

function _writeToChunkFile(destFilePath, doneFunc, content) {
  Fs.writeFileSync(destFilePath, content, "utf8");
  doneFunc();
}

function _convertArrayToList(array) {
  return Js_array.reduce((function (list, str) {
                return {
                        hd: str,
                        tl: list
                      };
              }), /* [] */0, array);
}

function _createChunkFile(_buildChunkFileContent, glslPathArr, destFilePath, doneFunc) {
  _writeToChunkFile(destFilePath, doneFunc, Curry._1(_buildChunkFileContent, Parse$Glsl_converter.parseImport(List.map((function (actualGlslPath) {
                      return Parse$Glsl_converter.parseSegment(actualGlslPath, Fs.readFileSync(actualGlslPath, "utf8"));
                    }), _convertArrayToList(ArrayUtils$Glsl_converter.flatten(Js_array.map((function (glslPath) {
                                  return Glob.sync(glslPath);
                                }), glslPathArr)))))));
}

function createChunkFileForTs(glslPathArr, destFilePath, doneFunc) {
  var partial_arg = [
    _buildInitDataContentForTs,
    _functionContentForTs
  ];
  _createChunkFile((function (param) {
          return _buildChunkFileContent(partial_arg, param);
        }), glslPathArr, destFilePath, doneFunc);
}

function createChunkFileForRes(glslPathArr, destFilePath, doneFunc) {
  var partial_arg = [
    _buildInitDataContentForRes,
    _functionContentForRes
  ];
  _createChunkFile((function (param) {
          return _buildChunkFileContent(partial_arg, param);
        }), glslPathArr, destFilePath, doneFunc);
}

export {
  _functionContentForTs ,
  _buildInitDataContentForTs ,
  _functionContentForRes ,
  _buildInitDataContentForRes ,
  _buildChunkFileContent ,
  _writeToChunkFile ,
  _convertArrayToList ,
  _createChunkFile ,
  createChunkFileForTs ,
  createChunkFileForRes ,
}
/* fs Not a pure module */
