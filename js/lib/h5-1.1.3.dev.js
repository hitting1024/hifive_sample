/*
 * Copyright (C) 2012-2013 NS Solutions Corporation
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 *
 * hifive
 *   version 1.1.3
 *   gitCommitId : 0494f4cb5de5391115e12995dd3a8c3caf130acf
 *   build at 2013/03/12 12:56:32.916 (+0900)
 *   (util,controller,modelWithBinding,view,ui,api.geo,api.sqldb,api.storage)
 */
(function($){

	// =========================================================================
	//
	// Prelude
	//
	// =========================================================================

	var savedH5 = undefined;

	//h5存在チェック
	if (window.h5) {
		if (window.h5.env && (window.h5.env.version === '1.1.3')) {
			// 既にロード済みのhifiveと同じバージョンをロードしようとした場合は何もしない
			return;
		}
		//coexistのために既存のh5を退避
		savedH5 = window.h5;
	}

	// h5空間を新規に作成。クロージャでくるんでいるので
	// 以降の各モジュールが見るh5はここで定義された(新しい)h5になる
	var h5 = {};

	// =============================
	// Expose to window
	// =============================

	window.h5 = h5;

	h5.coexist = function() {
		window.h5 = savedH5;
		return h5;
	};

	h5.env = {
		version: '1.1.3'
	};

	// =========================================================================
	//
	// Extenal Library
	//
	// =========================================================================


	// =========================================================================
	//
	// Modules
	//
	// =========================================================================



/* h5scopedglobals */

// =========================================================================
//
// Scoped Globals
//
// =========================================================================
// =============================
// Misc Variables
// =============================
/**
 * { (エラーコード): (フォーマット文字列) } マップ
 *
 * @private
 */
var errorCodeToMessageMap = {};

/**
 * { (エラーコード)： (フォーマッタ関数) } マップ
 */
var errorCodeToCustomFormatterMap = {};

//=============================
// Errors
//=============================
// =============================
// Misc Functions
// =============================

/**
 * フレームワークエラーを発生させます。
 *
 * @private
 * @param code {Number} エラーコード
 * @param msgParam {Any[]} フォーマットパラメータ
 * @param detail {Any} 追加のデータ(内容はAPIごとに異なる)
 */
function throwFwError(code, msgParam, detail) {
	var msg = null;
	var msgSrc = errorCodeToMessageMap[code];

	var customFormatter = errorCodeToCustomFormatterMap[code];
	if (customFormatter) {
		msg = customFormatter(code, msgSrc, msgParam, detail);
	}

	//カスタムフォーマッタがnull/undefinedを返した場合も標準フォーマッタにかける
	if (!msg && msgSrc) {
		msg = h5.u.str.format.apply(null, [msgSrc].concat(msgParam));
	}

	if (msg) {
		//最後に必ずエラーコードを付ける
		msg += '(code=' + code + ')';
	}

	var e = msg ? new Error(msg) : new Error('FwError: code = ' + code);

	if (code) {
		e.code = code;
	}
	if (detail) {
		e.detail = detail;
	}

	throw e;
}

/* del begin */
// テストのためにexposeする
window.com = {
	htmlhifive: {
		throwFwError: throwFwError
	}
};
/* del end */


/**
 * エラーコードとエラーメッセージのマップを追加します。
 *
 * @private
 * @param mapObj {Object} { (エラーコード): (フォーマット文字列) }という構造のオブジェクト
 */
function addFwErrorCodeMap(mapObj) {
	for (code in mapObj) {
		if (mapObj.hasOwnProperty(code)) {
			errorCodeToMessageMap[code] = mapObj[code];
		}
	}
}

/**
 * エラーコードとカスタムメッセージフォーマッタのマップを追加します。
 *
 * @private
 * @param errorCode エラーコード
 * @param formatter カスタムメッセージフォーマッタ
 */
function addFwErrorCustomFormatter(errorCode, formatter) {
	errorCodeToCustomFormatterMap[errorCode] = formatter;
}

/**
 * 非同期APIのReject時の理由オブジェクトを作成します。
 *
 * @private
 * @param code {Number} エラーコード
 * @param msgParam {Any[]} フォーマットパラメータ
 * @param detail {Any} 追加のデータ(内容はAPIごとに異なる)
 * @returns {Object} 理由オブジェクト
 */
function createRejectReason(code, msgParam, detail) {
	var msg = null;
	var f = errorCodeToMessageMap[code];
	if (f) {
		var args = [f].concat(msgParam);
		msg = h5.u.str.format.apply(null, args);
	}

	return {
		code: code,
		message: msg,
		detail: detail
	};
}

/**
 * 引数を配列化します。既に配列だった場合はそれをそのまま返し、 配列以外だった場合は配列にして返します。 ただし、nullまたはundefinedの場合はそのまま返します。
 *
 * @private
 * @param value 値
 * @returns 配列化された値、ただし引数がnullまたはundefinedの場合はそのまま
 */
function wrapInArray(value) {
	if (value == null) {
		return value;
	}
	return $.isArray(value) ? value : [value];
}

/**
 * 相対URLを絶対URLに変換します。
 *
 * @private
 * @param {String} relativePath 相対URL
 * @returns {String} 絶対パス
 */
function toAbsoluteUrl(relativePath) {
	var e = document.createElement('span');
	e.innerHTML = '<a href="' + relativePath + '" />';
	return e.firstChild.href;
}

/**
 * 引数が文字列かどうかを判定します。
 *
 * @private
 * @param {Any} target 値
 * @returns {boolean} 文字列ならtrue、そうでないならfalse
 */
function isString(target) {
	return typeof target === 'string';
}

/**
 * DeferredオブジェクトがReject状態かどうかを判定します。 jQuery1.7でDeferred.isRejected/isResolvedはDeprecatedとなり、
 * 1.8で削除された（代わりにstate()メソッドが1.7から追加された）ので、 使用可能なAPIを用いて判定します。
 *
 * @private
 * @param {Object} dfd Deferredオブジェクト
 * @returns {Boolean} Rejected状態かどうか
 */
function isRejected(dfd) {
	if (dfd.isRejected) {
		return dfd.isRejected();
	}
	//jQuery 1.7でisRejectedはDeprecatedになり、1.8.0で削除された
	return dfd.state() === 'rejected';
}

/**
 * DeferredオブジェクトがReject状態かどうかを判定します。 jQuery1.7でDeferred.isRejected/isResolvedはDeprecatedとなり、
 * 1.8で削除された（代わりにstate()メソッドが1.7から追加された）ので、 使用可能なAPIを用いて判定します。
 *
 * @private
 * @param {Object} dfd Deferredオブジェクト
 * @returns {Boolean} Resolved状態かどうか
 */
function isResolved(dfd) {
	if (dfd.isResolved) {
		return dfd.isResolved();
	}
	return dfd.state() === 'resolved';
}

/**
 * 引数が名前空間として有効な文字列かどうかを判定します。 ただし、全角文字が含まれる場合はfalseを返します。
 *
 * @private
 * @param {Any} property 値
 * @returns {boolean} 名前空間として有効な文字列であればtrue、そうでないならfalse
 */
function isValidNamespaceIdentifier(property) {
	if (!isString(property)) {
		return false;
	}

	// 全角文字は考慮しない
	return !!property.match(/^[A-Za-z_\$][\w|\$]*$/);
}

// =============================
// ロガー・アスペクトで使用する共通処理
// =============================
/**
 * 文字列の正規表現記号をエスケープします。
 *
 * @private
 * @param {String} str 文字列
 * @returns {String} エスケープ済文字列
 */
function escapeRegex(str) {
	return str.replace(/\W/g, '\\$&');
}

/**
 * 引数がStringの場合、RegExpオブジェクトにして返します。 引数がRegExpオブジェクトの場合はそのまま返します。
 *
 * @private
 * @param {String|RegExp} target 値
 * @returns {RegExp} オブジェクト
 */
function getRegex(target) {
	if ($.type(target) === 'regexp') {
		return target;
	}
	var str = '';
	if (target.indexOf('*') !== -1) {
		var array = $.map(target.split('*'), function(n) {
			return escapeRegex(n);
		});
		str = array.join('.*');
	} else {
		str = target;
	}
	return new RegExp('^' + str + '$');
}

//TODO あるオブジェクト下に名前空間を作ってexposeするようなメソッドを作る
var h5internal = {
	core: {
		controllerInternal: null
	}
};


/* ------ h5.u ------ */
(function() {
	// =========================================================================
	//
	// Constants
	//
	// =========================================================================

	// =============================
	// Production
	// =============================

	/**
	 * undefinedのタイプ
	 */
	var TYPE_OF_UNDEFINED = 'undefined';

	/**
	 * シリアライザのバージョン
	 */
	var CURRENT_SEREALIZER_VERSION = '1';

	// エラーコード
	/**
	 * ns()、getByPathで引数の名前空間名にstring以外が渡されたときに発生するエラー
	 */
	var ERR_CODE_NAMESPACE_INVALID = 11000;

	/**
	 * expose()で既に存在する名前空間が指定されたときに発生するエラー
	 */
	var ERR_CODE_NAMESPACE_EXIST = 11001;

	/**
	 * serialize()に関数オブジェクトが渡されたときに発生するエラー
	 */
	var ERR_CODE_SERIALIZE_FUNCTION = 11002;

	/**
	 * 現行のバージョンと違うバージョンでserialize()された文字列をdeserialize()しようとしたときに発生するエラー
	 */
	var ERR_CODE_SERIALIZE_VERSION = 11003;

	/**
	 * deserialize()で型情報の判定に失敗したときに発生するエラー
	 */
	var ERR_CODE_DESERIALIZE_TYPE = 11004;

	/**
	 * serialize()に渡されたオブジェクト/配列が循環参照を持つときに発生するエラー
	 */
	var ERR_CODE_CIRCULAR_REFERENCE = 11005;

	/**
	 * deserialize()で値が不正でデシリアライズできない時に発生するエラー
	 */
	var ERR_CODE_DESERIALIZE_VALUE = 11006;

	/**
	 * loadScript()に渡されたパスが不正(文字列以外、空文字、空白文字)である時に発生するエラー
	 */
	var ERR_CODE_INVALID_SCRIPT_PATH = 11007;

	/**
	 * loadScript()に渡されたオプションが不正(プレーンオブジェクト、null、undefined)である時に発生するエラー
	 */
	var ERR_CODE_INVALID_OPTION = 11008;

	/**
	 * deserialize()で引数に文字列でないものを渡されたときのエラー
	 */
	var ERR_CODE_DESERIALIZE_ARGUMENT = 11009;

	/**
	 * loadScript() 読み込みに失敗した場合に発生するエラー
	 */
	var ERR_CODE_SCRIPT_FILE_LOAD_FAILD = 11010;

	// =============================
	// Development Only
	// =============================

	/* del begin */
	/**
	 * 各エラーコードに対応するメッセージ
	 */
	var errMsgMap = {};
	errMsgMap[ERR_CODE_NAMESPACE_INVALID] = '{0} 名前空間の指定が不正です。名前空間として有効な文字列を指定してください。';
	errMsgMap[ERR_CODE_NAMESPACE_EXIST] = '名前空間"{0}"には、プロパティ"{1}"が既に存在します。';
	errMsgMap[ERR_CODE_SERIALIZE_FUNCTION] = 'Function型のオブジェクトは変換できません。';
	errMsgMap[ERR_CODE_SERIALIZE_VERSION] = 'シリアライザのバージョンが違います。シリアライズされたバージョン：{0} 現行のバージョン：{1}';
	errMsgMap[ERR_CODE_DESERIALIZE_TYPE] = '型指定子が不正です。';
	errMsgMap[ERR_CODE_CIRCULAR_REFERENCE] = '循環参照が含まれています。';
	errMsgMap[ERR_CODE_DESERIALIZE_VALUE] = '不正な値が含まれるため、デシリアライズできませんでした。';
	errMsgMap[ERR_CODE_INVALID_SCRIPT_PATH] = 'スクリプトのパスが不正です。空文字以外の文字列、またはその配列を指定して下さい。';
	errMsgMap[ERR_CODE_INVALID_OPTION] = '{0} オプションの指定が不正です。プレーンオブジェクトで指定してください。';
	errMsgMap[ERR_CODE_DESERIALIZE_ARGUMENT] = 'deserialize() 引数の値が不正です。引数には文字列を指定してください。';
	errMsgMap[ERR_CODE_SCRIPT_FILE_LOAD_FAILD] = 'スクリプトファイルの読み込みに失敗しました。URL:{0}';

	// メッセージの登録
	addFwErrorCodeMap(errMsgMap);
	/* del end */


	// =========================================================================
	//
	// Cache
	//
	// =========================================================================
	// =========================================================================
	//
	// Privates
	//
	// =========================================================================
	// =============================
	// Variables
	// =============================
	/**
	 * loadScript()によって追加されたjsファイルの絶対パスを保持するオブジェクト
	 *
	 * @private
	 */
	var addedJS = {};

	/**
	 * HTMLのエスケープルール
	 *
	 * @private
	 */
	var htmlEscapeRules = {
		'&': '&amp;',
		'"': '&quot;',
		'<': '&lt;',
		'>': '&gt;',
		"'": '&apos;'
	};

	/**
	 * SCRIPTにonloadがあるかどうか
	 *
	 * @private
	 */
	var existScriptOnload = document.createElement('script').onload !== undefined;

	// =============================
	// Functions
	// =============================

	/**
	 * 型情報の文字列をコードに変換します。
	 *
	 * @private
	 * @returns {String} 型を表すコード（１字）
	 */
	function typeToCode(typeStr) {
		switch (typeStr) {
		case 'string':
			return 's';
		case 'number':
			return 'n';
		case 'boolean':
			return 'b';
		case 'String':
			return 'S';
		case 'Number':
			return 'N';
		case 'Boolean':
			return 'B';
		case 'infinity':
			return 'i';
		case '-infinity':
			return 'I';
		case 'nan':
			return 'x';
		case 'date':
			return 'd';
		case 'regexp':
			return 'r';
		case 'array':
			return 'a';
		case 'object':
			return 'o';
		case 'null':
			return 'l';
		case TYPE_OF_UNDEFINED:
			return 'u';
		case 'undefElem':
			return '_';
		case 'objElem':
			return '@';
		}
	}

	/**
	 * 指定されたスクリプトファイルをロードして、スクリプト文字列を取得します。(loadScriptメソッド用)
	 * <p>
	 * dataType:scriptを指定した場合のデフォルトの挙動は、スクリプトファイルの読み込み完了後に$.globalEval()で評価を行うため、
	 * convertersを上書きしています。
	 *
	 * @private
	 * @param {String} url 読み込み対象のスクリプトパス
	 * @param {Boolean} async 非同期でロードを行うか (true:非同期 / false:同期)
	 * @param {Boolean} cache キャッシュされた通信結果が存在する場合、その通信結果を使用するか (true:使用する/false:使用しない)
	 */
	function getScriptString(url, async, cache) {
		var df = h5.async.deferred();
		// 複数のパラメータを配列でまとめて指定できるため、コールバックの実行をresolveWith/rejectWith/notifyWithで行っている
		h5.ajax({
			url: url,
			async: async,
			cache: cache,
			dataType: 'script',
			converters: {
				'text script': function(text) {
					return text;
				}
			}
		}).done(function() {
			var args = argsToArray(arguments);
			args.push(this.url);

			df.notifyWith(df, args);
			df.resolveWith(df, args);
		}).fail(function() {
			df.rejectWith(df, argsToArray(arguments));
		});

		return df.promise();
	}


	// =========================================================================
	//
	// Body
	//
	// =========================================================================

	/**
	 * ドット区切りで名前空間オブジェクトを生成します。
	 * （h5.u.obj.ns('sample.namespace')と呼ぶと、window.sample.namespaceとオブジェクトを生成します。）
	 * すでにオブジェクトが存在した場合は、それをそのまま使用します。 引数にString以外、または、識別子として不適切な文字列が渡された場合はエラーとします。
	 *
	 * @param {String} namespace 名前空間
	 * @memberOf h5.u.obj
	 * @returns {Object} 作成した名前空間オブジェクト
	 */
	function ns(namespace) {
		if (!isString(namespace)) {
			// 文字列でないならエラー
			throwFwError(ERR_CODE_NAMESPACE_INVALID, 'h5.u.obj.ns()');
		}

		var nsArray = namespace.split('.');
		var len = nsArray.length;

		for ( var i = 0; i < len; i++) {
			if (!isValidNamespaceIdentifier(nsArray[i])) {
				// 名前空間として不正な文字列ならエラー
				throwFwError(ERR_CODE_NAMESPACE_INVALID, 'h5.u.obj.ns()');
			}
		}

		var parentObj = window;
		for ( var i = 0; i < len; i++) {
			var name = nsArray[i];
			if (parentObj[name] === undefined) {
				parentObj[name] = {};
			}
			parentObj = parentObj[name];
		}

		// ループが終了しているので、parentObjは一番末尾のオブジェクトを指している
		return parentObj;
	}

	/**
	 * 指定された名前空間に、オブジェクトの各プロパティをそれぞれ対応するキー名で公開（グローバルからたどれる状態に）します。
	 * <p>
	 * <ul>
	 * <li>指定された名前空間が既に存在する場合は、その名前空間に対してプロパティを追加します。</li>
	 * <li>指定された名前空間にプロパティが存在する場合は、『上書きは行われず』例外が発生します。。</li>
	 * </ul>
	 * 実行例:
	 *
	 * <pre>
	 * expose('sample.namespace', {
	 * 	funcA: function() {
	 * 		return 'test';
	 * 	},
	 * 	value1: 10
	 * });
	 * </pre>
	 *
	 * 実行結果:&nbsp;(window.は省略可)<br>
	 * alert(window.sample.namespace.funcA) -&gt; "test"と表示。<br>
	 * alert(window.sample.namespace.value1) -&gt; 10と表示。
	 *
	 * @param {String} namespace 名前空間
	 * @param {Object} obj グローバルに公開したいプロパティをもつオブジェクト
	 * @memberOf h5.u.obj
	 */
	function expose(namespace, obj) {
		var nsObj = ns(namespace);
		for ( var prop in obj) {
			if (obj.hasOwnProperty(prop)) {
				if (nsObj[prop] !== undefined) {
					throwFwError(ERR_CODE_NAMESPACE_EXIST, [namespace, prop]);
				}
				nsObj[prop] = obj[prop];
			}
		}
	}

	/**
	 * 指定されたスクリプトをロードします。
	 *
	 * @param {String|String[]} path ソースパス
	 * @param {Object} [opt] オプション
	 * @param {Boolean} [opt.async] 非同期で読み込むかどうかを指定します。デフォルトはtrue(非同期)です。<br>
	 *            trueの場合、戻り値としてPromiseオブジェクトを返します。<br>
	 *            falseを指定すると同期的に読み込みます（loadScript関数からリターンしたタイミングで、スクリプトは読み込み済みになります）。<br>
	 *            falseの場合、戻り値はありません。<br>
	 *            なお、同期読み込みにすると場合によってはブラウザが固まる等の問題が発生する場合がありますので注意してください。
	 * @param {Boolean} [opt.force] 既に読み込み済みのスクリプトを再度読み込むかどうかを指定します。<br>
	 *            trueの場合、サーバーから最新のスクリプトファイルを取得します。デフォルトはfalse(読み込まない)です。
	 * @param {Boolean} [opt.parallel] 非同期で読み込む場合にパラレルに読み込むかどうかを指定します。<br>
	 *            trueの場合、指定した順番を考慮せずに読み込みます。デフォルトはfalse(シーケンシャルに読み込む)です。<br>
	 *            また、このオプションはasyncオプションがtrue(非同期)のときのみ有効です。
	 * @param {Boolean} [opt.atomic] ファイルの読み込みが全て正常に完了した時点でスクリプトを評価します。デフォルトはfalse(逐次読み込み)です。<br>
	 *            読み込みに失敗したファイルが1つ以上存在する場合、指定した全てのスクリプトがロードされません。
	 * @returns {Any} asyncオプションがtrueの場合はPromiseオブジェクトを、falseの場合は何も返しません。
	 * @name loadScript
	 * @function
	 * @memberOf h5.u
	 */
	function loadScript(path, opt) {
		var getDeferred = h5.async.deferred;
		var resources = wrapInArray(path);

		if (!resources || resources.length === 0) {
			throwFwError(ERR_CODE_INVALID_SCRIPT_PATH);
		}

		for ( var i = 0, l = resources.length; i < l; i++) {
			var path = resources[i];
			if (!isString(path) || !$.trim(path)) {
				throwFwError(ERR_CODE_INVALID_SCRIPT_PATH);
			}
		}

		if (opt != null && !$.isPlainObject(opt)) {
			throwFwError(ERR_CODE_INVALID_OPTION, 'h5.u.loadScript()');
		}

		// asyncオプションはデフォルトtrue(非同期)なので、falseが明示的に指定された場合のみfalse(同期)とする
		var async = opt && opt.async === false ? false : true;
		var force = !!(opt && opt.force === true);
		var parallel = !!(opt && opt.parallel === true);
		var atomic = !!(opt && opt.atomic === true);
		// forceオプションがtrue(ロード済みのJSファイルを再度読み込む)の場合、サーバから最新のファイルを取得する
		var cache = !force;

		var retDf = async ? getDeferred() : null;
		var retDfFailCallback = async ? function(url) {
			retDf.reject(createRejectReason(ERR_CODE_SCRIPT_FILE_LOAD_FAILD, [url]));
		} : null;
		var asyncFunc = async ? function() {
			var df = getDeferred();
			setTimeout(function() {
				df.resolve([]);
			}, 0);

			return df.promise();
		} : null;
		var promises = parallel ? [] : null;
		var scriptData = [];
		var loadedUrl = {};

		if (async) {
			// atomicオプションが無効でかつscript.onloadがあるブラウザ(IE6,7,8以外のブラウザ)の場合、SCRIPTタグでスクリプトを動的に読み込む
			// (IE9以降の場合、DocumentModeがQuirksおよび6～8の場合はonloadはundefinedになる)
			if (!atomic && existScriptOnload) {
				var $head = $('head');
				var scriptLoad = function(url) {
					var scriptDfd = getDeferred();
					var script = document.createElement('script');

					script.onload = function() {
						script.onload = null;
						addedJS[url] = url;
						scriptDfd.resolve();
					};
					script.onerror = function() {
						script.onerror = null;
						scriptDfd.reject(url);
					};

					script.type = 'text/javascript';
					// cacheがfalse(最新のJSファイルを取得する)の場合、URLの末尾にパラメータ(+new Date()で、getTime()の値)を付与して常に最新のJSファイルを取得する
					// URLにもともとパラメータが付いていれば、パラメータを追加する。
					script.src = cache ? url : url + ((url.indexOf('?') > -1) ? '&_' : '?_')
							+ (+new Date());
					$head[0].appendChild(script);

					return scriptDfd.promise();
				};

				if (parallel) {
					// 必ず非同期として処理されるようsetTimeout()を処理して強制的に非同期にする
					promises.push(asyncFunc());

					$.each(resources, function() {
						var url = toAbsoluteUrl(this);

						if (!force && url in addedJS) {
							return true;
						}

						promises.push(scriptLoad(url));
					});

					h5.async.when(promises).then(function() {
						retDf.resolve();
					}, retDfFailCallback);
				} else {
					// 必ず非同期として処理されるようsetTimeout()を処理して強制的に非同期にする
					var secDf = getDeferred().resolve().pipe(asyncFunc);

					$.each(resources, function() {
						var url = toAbsoluteUrl(this);

						secDf = secDf.pipe(function() {
							if (!force && url in addedJS) {
								return;
							}
							return scriptLoad(url);
						}, retDfFailCallback);
					});

					secDf.pipe(function() {
						retDf.resolve();
					}, retDfFailCallback);
				}
			}
			// IE6,7,8の場合、SCRIPTタグのonerrorイベントが発生しないため、読み込みが成功または失敗したか判定できない。
			// よってatomicな読み込みができないため、Ajaxでスクリプトを読み込む
			else {
				if (parallel) {
					var loadedScripts = [];

					// 必ず非同期として処理されるようsetTimeout()を処理して強制的に非同期にする
					promises.push(asyncFunc());
					loadedScripts.push(null);

					$.each(resources, function() {
						var url = toAbsoluteUrl(this);

						if (!force && (url in addedJS || url in loadedUrl)) {
							return true;
						}

						promises.push(getScriptString(url, async, cache));
						atomic ? loadedUrl[url] = url : loadedScripts.push(null);
					});

					var doneCallback = null;
					var progressCallback = null;

					if (atomic) {
						doneCallback = function() {
							$.each(argsToArray(arguments), function(i, e) {
								$.globalEval(e[0]); // e[0] = responseText
							});

							$.extend(addedJS, loadedUrl);
							retDf.resolve();
						};
						progressCallback = $.noop;
					} else {
						doneCallback = function() {
							retDf.resolve();
						};
						progressCallback = function() {
							var results = argsToArray(arguments);

							for ( var i = 0; i < loadedScripts.length; i++) {
								var result = results[i];

								if (!result) {
									continue;
								}

								var url = results[i][3]; // results[i][3] = url
								if (loadedScripts[i] === url) {
									continue;
								}

								$.globalEval(results[i][0]); // results[i][0] = responseText
								loadedScripts.splice(i, 1, url);
							}
						};
					}

					h5.async.when(promises).then(doneCallback, retDfFailCallback, progressCallback);
				} else {
					// 必ず非同期として処理されるようsetTimeout()を処理して強制的に非同期にする
					var secDf = getDeferred().resolve().pipe(asyncFunc);

					$.each(resources, function() {
						var url = toAbsoluteUrl(this);

						secDf = secDf.pipe(function() {
							var df = getDeferred();

							if (!force && (url in addedJS || url in loadedUrl)) {
								df.resolve();
							} else {
								getScriptString(url, async, cache).then(
										function(text, status, xhr) {
											if (atomic) {
												scriptData.push(text);
												loadedUrl[url] = url;
											} else {
												$.globalEval(text);
												addedJS[url] = url;
											}

											df.resolve();
										}, function() {
											df.reject(this.url);
										});
							}

							return df.promise();
						}, retDfFailCallback);
					});

					secDf.pipe(function() {
						if (atomic) {
							$.each(scriptData, function(i, e) {
								$.globalEval(e);
							});

							$.extend(addedJS, loadedUrl);
						}

						retDf.resolve();
					}, retDfFailCallback);
				}
			}

			return retDf.promise();
		} else {
			$.each(resources, function() {
				var url = toAbsoluteUrl(this);

				if (!force && (url in addedJS || url in loadedUrl)) {
					return true;
				}

				getScriptString(url, async, cache).then(function(text, status, xhr) {
					if (atomic) {
						scriptData.push(text);
						loadedUrl[url] = url;
					} else {
						$.globalEval(text);
						addedJS[url] = url;
					}

				}, function() {
					throwFwError(ERR_CODE_SCRIPT_FILE_LOAD_FAILD, [url]);
				});
			});

			if (atomic) {
				// 読み込みに成功した全てのスクリプトを評価する
				$.each(scriptData, function(i, e) {
					$.globalEval(e);
				});
				$.extend(addedJS, loadedUrl);
			}
			// 同期ロードの場合は何もreturnしない
		}
	}

	/**
	 * 文字列のプレフィックスが指定したものかどうかを返します。
	 *
	 * @param {String} str 文字列
	 * @param {String} prefix プレフィックス
	 * @returns {Boolean} 文字列のプレフィックスが指定したものかどうか
	 * @name startsWith
	 * @function
	 * @memberOf h5.u.str
	 */
	function startsWith(str, prefix) {
		return str.lastIndexOf(prefix, 0) === 0;
	}

	/**
	 * 文字列のサフィックスが指定したものかどうかを返します。
	 *
	 * @param {String} str 文字列
	 * @param {String} suffix サフィックス
	 * @returns {Boolean} 文字列のサフィックスが指定したものかどうか
	 * @name endsWith
	 * @function
	 * @memberOf h5.u.str
	 */
	function endsWith(str, suffix) {
		var sub = str.length - suffix.length;
		return (sub >= 0) && (str.lastIndexOf(suffix) === sub);
	}

	/**
	 * 第一引数の文字列に含まれる{0}、{1}、{2}...{n} (nは数字)を、第2引数以降に指定されたパラメータに置換します。
	 *
	 * <pre>
	 * 例：
	 * 		var myValue = 10;
	 * 		h5.u.str.format('{0} is {1}', 'myValue', myValue);
	 * </pre>
	 *
	 * 実行結果: myValue is 10
	 *
	 * @param {String} str 文字列
	 * @param {Any} var_args 可変長引数
	 * @returns {String} フォーマット済み文字列
	 * @name format
	 * @function
	 * @memberOf h5.u.str
	 */
	function format(str, var_args) {
		if (str == null) {
			return '';
		}
		var args = arguments;
		return str.replace(/\{(\d+)\}/g, function(m, c) {
			var rep = args[parseInt(c, 10) + 1];
			if (typeof rep === TYPE_OF_UNDEFINED) {
				return TYPE_OF_UNDEFINED;
			}
			return rep;
		});
	}

	/**
	 * 指定されたHTML文字列をエスケープします。
	 *
	 * @param {String} str HTML文字列
	 * @returns {String} エスケープ済HTML文字列
	 * @name escapeHTML
	 * @function
	 * @memberOf h5.u.str
	 */
	function escapeHtml(str) {
		if ($.type(str) !== 'string') {
			return str;
		}
		return str.replace(/[&"'<>]/g, function(c) {
			return htmlEscapeRules[c];
		});
	}

	/**
	 * オブジェクトを、型情報を付与した文字列に変換します。
	 * <p>
	 * このメソッドが判定可能な型は、以下のとおりです。
	 * <ul>
	 * <li>string(文字列)
	 * <li>number(数値)
	 * <li>boolean(真偽値)
	 * <li>String(文字列のラッパークラス型)
	 * <li>Number(数値のラッパークラス型)
	 * <li>Boolean(真偽値のラッパークラス型)
	 * <li>array(配列)
	 * <li>object(プレーンオブジェクト [new Object() または {…} のリテラルで作られたオブジェクト])
	 * <li>Date(日付)
	 * <li>RegExp(正規表現)
	 * <li>undefined
	 * <li>null
	 * <li>NaN
	 * <li>Infinity
	 * <li>-Infinity
	 * </ul>
	 * <p>
	 * このメソッドで文字列化したオブジェクトは<a href="#deserialize">deseriarize</a>メソッドで元に戻すことができます。
	 * </p>
	 * <p>
	 * object型はプレーンオブジェクトとしてシリアライズします。 渡されたオブジェクトがプレーンオブジェクトで無い場合、そのprototypeやconstructorは無視します。
	 * </p>
	 * <p>
	 * array型は連想配列として保持されているプロパティもシリアライズします。
	 * </p>
	 * <p>
	 * 循環参照を含むarray型およびobject型はシリアライズできません。例外をスローします。
	 * </p>
	 * <p>
	 * 内部に同一インスタンスを持つarray型またはobject型は、別インスタンスとしてシリアライズします。以下のようなarray型オブジェクトaにおいて、a[0]とa[1]が同一インスタンスであるという情報は保存しません。
	 *
	 * <pre>
	 * a = [];
	 * a[0] = a[1] = [];
	 * </pre>
	 *
	 * </p>
	 * <h4>注意</h4>
	 * <p>
	 * function型のオブジェクトは<b>変換できません</b>。例外をスローします。
	 * array型にfunction型のオブジェクトが存在する場合は、undefinedとしてシリアライズします。object型または連想配列にfunction型のオブジェクトが存在する場合は、無視します。
	 * </p>
	 *
	 * @param {Object} value オブジェクト
	 * @returns {String} 型情報を付与した文字列
	 * @name serialize
	 * @function
	 * @memberOf h5.u.obj
	 */
	function serialize(value) {
		if ($.isFunction(value)) {
			throwFwError(ERR_CODE_SERIALIZE_FUNCTION);
		}
		// 循環参照チェック用配列
		var objStack = [];
		function existStack(obj) {
			for ( var i = 0, len = objStack.length; i < len; i++) {
				if (obj === objStack[i]) {
					return true;
				}
			}
			return false;
		}

		function popStack(obj) {
			for ( var i = 0, len = objStack.length; i < len; i++) {
				if (obj === objStack[i]) {
					objStack.splice(i, 1);
				}
			}
		}

		function func(val) {
			var ret = val;
			var type = $.type(val);

			// プリミティブラッパークラスを判別する
			if (typeof val === 'object') {
				if (val instanceof String) {
					type = 'String';
				} else if (val instanceof Number) {
					type = 'Number';
				} else if (val instanceof Boolean) {
					type = 'Boolean';
				}
			}

			// オブジェクトや配列の場合、JSON.stringify()を使って書けるが、json2.jsのJSON.stringify()を使った場合に不具合があるため自分で実装した。
			switch (type) {
			case 'String':
			case 'string':
				ret = typeToCode(type) + ret;
				break;
			case 'Boolean':
				ret = ret.valueOf();
			case 'boolean':
				ret = typeToCode(type) + ((ret) ? 1 : 0);
				break;
			case 'Number':
				ret = ret.valueOf();
				if (($.isNaN && $.isNaN(val)) || ($.isNumeric && !$.isNumeric(val))) {
					if (val.valueOf() === Infinity) {
						ret = typeToCode('infinity');
					} else if (val.valueOf() === -Infinity) {
						ret = typeToCode('-infinity');
					} else {
						ret = typeToCode('nan');
					}
				}
				ret = typeToCode(type) + ret;
				break;
			case 'number':
				if (($.isNaN && $.isNaN(val)) || ($.isNumeric && !$.isNumeric(val))) {
					if (val === Infinity) {
						ret = typeToCode('infinity');
					} else if (val === -Infinity) {
						ret = typeToCode('-infinity');
					} else {
						ret = typeToCode('nan');
					}
				} else {
					ret = typeToCode(type) + ret;
				}
				break;
			case 'regexp':
				ret = typeToCode(type) + ret.toString();
				break;
			case 'date':
				ret = typeToCode(type) + (+ret);
				break;
			case 'array':
				if (existStack(val)) {
					throwFwError(ERR_CODE_REFERENCE_CYCLE);
				}
				objStack.push(val);
				var indexStack = [];
				ret = typeToCode(type) + '[';
				for ( var i = 0, len = val.length; i < len; i++) {
					indexStack[i.toString()] = true;
					var elm;
					if (!val.hasOwnProperty(i)) {
						elm = typeToCode('undefElem');
					} else if ($.type(val[i]) === 'function') {
						elm = typeToCode(TYPE_OF_UNDEFINED);
					} else {
						elm = (func(val[i])).replace(/\\/g, '\\\\').replace(/"/g, '\\"');
					}
					ret += '"' + elm + '"';
					if (i !== val.length - 1) {
						ret += ',';
					}
				}
				var hash = '';
				for ( var key in val) {
					if (indexStack[key]) {
						continue;
					}
					if ($.type(val[key]) !== 'function') {
						hash += '"' + key + '":"'
								+ (func(val[key])).replace(/\\/g, '\\\\').replace(/"/g, '\\"')
								+ '",';
					}
				}
				if (hash) {
					ret += ((val.length) ? ',' : '') + '"' + typeToCode('objElem') + '{'
							+ hash.replace(/\\/g, '\\\\').replace(/"/g, '\\"');
					ret = ret.replace(/,$/, '');
					ret += '}"';
				}
				ret += ']';
				popStack(val);
				break;
			case 'object':
				if (existStack(val)) {
					throwFwError(ERR_CODE_CIRCULAR_REFERENCE);
				}
				objStack.push(val);
				ret = typeToCode(type) + '{';
				for ( var key in val) {
					if (val.hasOwnProperty(key)) {
						if ($.type(val[key]) === 'function') {
							continue;
						}
						ret += '"' + key + '":"'
								+ (func(val[key])).replace(/\\/g, '\\\\').replace(/"/g, '\\"')
								+ '",';
					}
				}
				ret = ret.replace(/,$/, '');
				ret += '}';
				popStack(val);
				break;
			case 'null':
			case TYPE_OF_UNDEFINED:
				ret = typeToCode(type);
				break;
			}

			return ret;
		}

		return CURRENT_SEREALIZER_VERSION + '|' + func(value);
	}

	/**
	 * 型情報が付与された文字列をオブジェクトを復元します。
	 *
	 * @param {String} value 型情報が付与された文字列
	 * @returns {Any} 復元されたオブジェクト
	 * @name deserialize
	 * @function
	 * @memberOf h5.u.obj
	 */
	function deserialize(value) {
		if (!isString(value)) {
			throwFwError(ERR_CODE_DESERIALIZE_ARGUMENT);
		}

		value.match(/^(.)\|(.*)/);
		var version = RegExp.$1;
		if (version !== CURRENT_SEREALIZER_VERSION) {
			throwFwError(ERR_CODE_SERIALIZE_VERSION, [version, CURRENT_SEREALIZER_VERSION]);
		}
		var ret = RegExp.$2;

		function func(val) {
			/**
			 * 型情報のコードを文字列に変換します。
			 *
			 * @private
			 * @returns {String} 型を表す文字列
			 */
			function codeToType(typeStr) {
				switch (typeStr) {
				case 's':
					return 'string';
				case 'n':
					return 'number';
				case 'b':
					return 'boolean';
				case 'S':
					return 'String';
				case 'N':
					return 'Number';
				case 'B':
					return 'Boolean';
				case 'i':
					return 'infinity';
				case 'I':
					return '-infinity';
				case 'x':
					return 'nan';
				case 'd':
					return 'date';
				case 'r':
					return 'regexp';
				case 'a':
					return 'array';
				case 'o':
					return 'object';
				case 'l':
					return 'null';
				case 'u':
					return TYPE_OF_UNDEFINED;
				case '_':
					return 'undefElem';
				case '@':
					return 'objElem';
				}
			}
			val.match(/^(.)(.*)/);
			var type = RegExp.$1;
			ret = (RegExp.$2) ? RegExp.$2 : '';
			if (type !== undefined && type !== '') {
				switch (codeToType(type)) {
				case 'String':
					ret = new String(ret);
					break;
				case 'string':
					break;
				case 'Boolean':
					if (ret === '0' || ret === '1') {
						ret = new Boolean(ret === '1');
					} else {
						throwFwError(ERR_CODE_DESERIALIZE_VALUE);
					}
					break;
				case 'boolean':
					if (ret === '0' || ret === '1') {
						ret = ret === '1';
					} else {
						throwFwError(ERR_CODE_DESERIALIZE_VALUE);
					}
					break;
				case 'nan':
					if (ret !== '') {
						throwFwError(ERR_CODE_DESERIALIZE_VALUE);
					}
					ret = NaN;
					break;
				case 'infinity':
					if (ret !== '') {
						throwFwError(ERR_CODE_DESERIALIZE_VALUE);
					}
					ret = Infinity;
					break;
				case '-infinity':
					if (ret !== '') {
						throwFwError(ERR_CODE_DESERIALIZE_VALUE);
					}
					ret = -Infinity;
					break;
				case 'Number':
					if (codeToType(ret) === 'infinity') {
						ret = new Number(Infinity);
					} else if (codeToType(ret) === '-infinity') {
						ret = new Number(-Infinity);
					} else if (codeToType(ret) === 'nan') {
						ret = new Number(NaN);
					} else {
						ret = new Number(ret);
						if (isNaN(ret.valueOf())) {
							throwFwError(ERR_CODE_DESERIALIZE_VALUE);
						}
					}
					break;
				case 'number':
					ret = new Number(ret).valueOf();
					if (isNaN(ret)) {
						throwFwError(ERR_CODE_DESERIALIZE_VALUE);
					}
					break;
				case 'array':
					var obj;
					try {
						obj = $.parseJSON(ret);
					} catch (e) {
						throwFwError(ERR_CODE_DESERIALIZE_VALUE);
					}
					if (!$.isArray(obj)) {
						throwFwError(ERR_CODE_DESERIALIZE_VALUE);
					}
					for ( var i = 0; i < obj.length; i++) {
						switch (codeToType(obj[i].substring(0, 1))) {
						case 'undefElem':
							delete obj[i];
							break;
						case 'objElem':
							var extendObj = func(typeToCode('object') + obj[i].substring(1));
							var tempObj = [];
							for ( var i = 0, l = obj.length - 1; i < l; i++) {
								tempObj[i] = obj[i];
							}
							obj = tempObj;
							for ( var key in extendObj) {
								obj[key] = extendObj[key];
							}
							break;
						default:
							obj[i] = func(obj[i]);
						}
					}
					ret = obj;
					break;
				case 'object':
					var obj;
					try {
						obj = $.parseJSON(ret);
					} catch (e) {
						throwFwError(ERR_CODE_DESERIALIZE_VALUE);
					}
					if (!$.isPlainObject(obj)) {
						throwFwError(ERR_CODE_DESERIALIZE_VALUE);
					}
					for ( var key in obj) {
						obj[key] = func(obj[key]);
					}
					ret = obj;
					break;
				case 'date':
					ret = new Date(parseInt(ret, 10));
					break;
				case 'regexp':
					ret.match(/^\/(.*)\/(.*)$/);
					var regStr = RegExp.$1;
					var flg = RegExp.$2;
					try {
						ret = new RegExp(regStr, flg);
					} catch (e) {
						throwFwError(ERR_CODE_DESERIALIZE_VALUE);
					}
					break;
				case 'null':
					if (ret !== '') {
						throwFwError(ERR_CODE_DESERIALIZE_VALUE);
					}
					ret = null;
					break;
				case TYPE_OF_UNDEFINED:
					if (ret !== '') {
						throwFwError(ERR_CODE_DESERIALIZE_VALUE);
					}
					ret = undefined;
					break;
				default:
					throwFwError(ERR_CODE_DESERIALIZE_TYPE);
				}
			}

			return ret;
		}
		return func(ret);
	}

	/**
	 * オブジェクトがjQueryオブジェクトかどうかを返します。
	 *
	 * @param {Object} obj オブジェクト
	 * @returns {Boolean} jQueryオブジェクトかどうか
	 * @name isJQueryObject
	 * @function
	 * @memberOf h5.u.obj
	 */
	function isJQueryObject(obj) {
		if (!obj || !obj.jquery) {
			return false;
		}
		return (obj.jquery === $().jquery);
	}

	/**
	 * argumentsを配列に変換します。
	 *
	 * @param {Arguments} args Arguments
	 * @returns {Any[]} argumentsを変換した配列
	 * @name argsToArray
	 * @function
	 * @memberOf h5.u.obj
	 */
	function argsToArray(args) {
		return Array.prototype.slice.call(args);
	}

	/**
	 * 指定された名前空間に存在するオブジェクトを取得します。
	 *
	 * @param {String} namespace 名前空間
	 * @returns {Any} その名前空間に存在するオブジェクト
	 * @name getByPath
	 * @function
	 * @memberOf h5.u.obj
	 */
	function getByPath(namespace) {
		if (!isString(namespace)) {
			throwFwError(ERR_CODE_NAMESPACE_INVALID, 'h5.u.obj.getByPath()');
		}

		var names = namespace.split('.');
		if (names[0] === 'window') {
			names.unshift();
		}
		var ret = window;
		for ( var i = 0, len = names.length; i < len; i++) {
			ret = ret[names[i]];
			if (ret == null) { // nullまたはundefinedだったら辿らない
				break;
			}
		}

		return ret;
	}

	/**
	 * インターセプタを作成します。
	 *
	 * @param {Function} pre インターセプト先関数の実行前に呼ばれる関数です。
	 * @param {Function} post インターセプト先関数の実行後に呼ばれる関数です。<br />
	 *            <ul>
	 *            <li>pre(), post()には引数としてinvocationとdata(preからpostへ値を渡すための入れ物オブジェクト)が渡されます。</li>
	 *            <li>post()は、呼び出した関数の戻り値がPromiseオブジェクトかどうかをチェックし、Promiseオブジェクトの場合は対象のDeferredが完了した後に呼ばれます。</li>
	 *            <li>pre()の中でinvocation.proceed()が呼ばれなかった場合、post()は呼ばれません。</li>
	 *            <li>invocation.resultプロパティに呼び出した関数の戻り値が格納されます。</li>
	 *            <li>pre()が指定されていない場合、invocation.proceed()を実行した後にpost()を呼びます。</li>
	 *            </ul>
	 *            コード例(h5.core.interceptor.lapInterceptor)を以下に示します。<br />
	 *
	 * <pre>
	 * var lapInterceptor = h5.u.createInterceptor(function(invocation, data) {
	 * 	// 開始時間をdataオブジェクトに格納
	 * 		data.start = new Date();
	 * 		// invocationを実行
	 * 		return invocation.proceed();
	 * 	}, function(invocation, data) {
	 * 		// 終了時間を取得
	 * 		var end = new Date();
	 * 		// ログ出力
	 * 		this.log.info('{0} &quot;{1}&quot;: {2}ms', this.__name, invocation.funcName, (end - data.start));
	 * 	});
	 * </pre>
	 *
	 * @returns {Function} インターセプタ
	 * @name createInterceptor
	 * @function
	 * @memberOf h5.u
	 */
	function createInterceptor(pre, post) {
		return function(invocation) {
			var data = {};
			var ret = pre ? pre.call(this, invocation, data) : invocation.proceed();
			invocation.result = ret;
			if (!post) {
				return ret;
			}
			if (h5.async.isPromise(ret)) {
				var that = this;
				ret.always(function() {
					post.call(that, invocation, data);
				});
				return ret;
			}
			post.call(this, invocation, data);
			return ret;
		};
	}

	// =============================
	// Expose to window
	// =============================

	expose('h5.u', {
		loadScript: loadScript,
		createInterceptor: createInterceptor
	});

	/**
	 * @namespace
	 * @name str
	 * @memberOf h5.u
	 */
	expose('h5.u.str', {
		startsWith: startsWith,
		endsWith: endsWith,
		format: format,
		escapeHtml: escapeHtml
	});

	/**
	 * @namespace
	 * @name obj
	 * @memberOf h5.u
	 */
	expose('h5.u.obj', {
		expose: expose,
		ns: ns,
		serialize: serialize,
		deserialize: deserialize,
		isJQueryObject: isJQueryObject,
		argsToArray: argsToArray,
		getByPath: getByPath
	});
})();


/* ------ h5.log ------ */
(function() {
	// =========================================================================
	//
	// Constants
	//
	// =========================================================================

	// =============================
	// Production
	// =============================

	// エラーコード
	/**
	 * ログターゲット(targets)の指定が不正なときのエラーコード
	 */
	var ERR_CODE_LOG_TARGET_TYPE = 10000;

	/*
	 * out.categoryのが指定されていないときのエラーコード
	 * ERR_CODE_OUT_CATEGORY_INVALIDに統合したためver.1.1.0で廃止
	 * var ERR_CODE_OUT_CATEGORY_IS_NONE = 10001;
	 */

	/**
	 * カテゴリが複数回指定されたときのエラーコード
	 */
	var ERR_CODE_CATEGORY_NAMED_MULTIPLE_TIMES = 10002;

	/**
	 * ログレベルの指定が不正なときのエラーコード
	 */
	var ERR_CODE_LEVEL_INVALID = 10003;

	/**
	 * 存在しないログターゲットを指定されたときのエラーコード
	 */
	var ERR_CODE_LOG_TARGETS_IS_NONE = 10004;

	/**
	 * カテゴリに文字列以外または空文字を指定したときのエラーコード
	 */
	var ERR_CODE_CATEGORY_INVALID = 10005;

	/**
	 * ログターゲット(targets)が複数回指定されたときのエラーコード
	 */
	var ERR_CODE_LOG_TARGETS_NAMED_MULTIPLE_TIMES = 10007;

	/**
	 * ログターゲット(targets)に文字列以外または空文字を指定されたときのエラーコード
	 */
	var ERR_CODE_LOG_TARGETS_INVALID = 10008;

	/**
	 * ログターゲット(target)にオブジェクト以外を指定されたときのエラーコード
	 */
	var ERR_CODE_LOG_TARGET_INVALID = 10009;

	/**
	 * out.categoryが指定されていないときのエラーコード
	 */
	var ERR_CODE_OUT_CATEGORY_INVALID = 10010;

	// =============================
	// Development Only
	// =============================

	/* del begin */
	/**
	 * 各エラーコードに対応するメッセージ
	 */
	var errMsgMap = {};
	errMsgMap[ERR_CODE_LOG_TARGET_TYPE] = 'ログターゲットのtypeには、オブジェクト、もしくは"console"のみ指定可能です。';
	errMsgMap[ERR_CODE_CATEGORY_NAMED_MULTIPLE_TIMES] = 'category"{0}"が複数回指定されています。';
	errMsgMap[ERR_CODE_LEVEL_INVALID] = 'level"{0}"の指定は不正です。Number、もしくはtrace, info, debug, warn, error, noneを指定してください。';
	errMsgMap[ERR_CODE_LOG_TARGETS_NAMED_MULTIPLE_TIMES] = 'ログターゲット"{0}"が複数回指定されています。';
	errMsgMap[ERR_CODE_LOG_TARGETS_IS_NONE] = '"{0}"という名前のログターゲットはありません。';
	errMsgMap[ERR_CODE_CATEGORY_INVALID] = 'categoryは必須項目です。空文字で無い文字列を指定して下さい。';
	errMsgMap[ERR_CODE_LOG_TARGETS_INVALID] = 'ログターゲット(targets)の指定は1文字以上の文字列、または配列で指定してください。';
	errMsgMap[ERR_CODE_LOG_TARGET_INVALID] = 'ログターゲット(target)の指定はプレーンオブジェクトで指定してください。';
	errMsgMap[ERR_CODE_OUT_CATEGORY_INVALID] = 'outの各要素についてcategoryは文字列で指定する必要があります。';

	// メッセージの登録
	addFwErrorCodeMap(errMsgMap);
	/* del end */


	// =========================================================================
	//
	// Cache
	//
	// =========================================================================
	// =========================================================================
	//
	// Privates
	//
	// =========================================================================
	// =============================
	// Variables
	// =============================
	var logLevel = {

		/**
		 * ログレベル: ERROR
		 *
		 * @memberOf Log.LEVEL
		 * @const {Object} ERROR
		 * @type Number
		 */
		ERROR: 50,

		/**
		 * ログレベル: WARN
		 *
		 * @memberOf Log.LEVEL
		 * @const {Object} WARN
		 * @type Number
		 */
		WARN: 40,

		/**
		 * ログレベル: INFO
		 *
		 * @memberOf Log.LEVEL
		 * @const {Object} INFO
		 * @type Number
		 */
		INFO: 30,

		/**
		 * ログレベル: DEBUG
		 *
		 * @memberOf Log.LEVEL
		 * @const {Object} DEBUG
		 * @type Number
		 */
		DEBUG: 20,

		/**
		 * ログレベル: TRACE
		 *
		 * @memberOf Log.LEVEL
		 * @const {Object} TRACE
		 * @type Number
		 */
		TRACE: 10,

		/**
		 * ログレベル: ALL
		 *
		 * @memberOf Log.LEVEL
		 * @const {Object} ALL
		 * @type Number
		 */
		ALL: 0,

		/**
		 * ログレベル: NONE
		 *
		 * @memberOf Log.LEVEL
		 * @const {Object} NONE
		 * @type Number
		 */
		NONE: -1
	};

	// コンパイル済ログ設定
	var compiledLogSettings = null;

	// =============================
	// Functions
	// =============================
	/**
	 * 指定されたレベルを文字列に変換します。
	 */
	function levelToString(level) {
		if (level === logLevel.ERROR) {
			return 'ERROR';
		} else if (level === logLevel.WARN) {
			return 'WARN';
		} else if (level === logLevel.INFO) {
			return 'INFO';
		} else if (level === logLevel.DEBUG) {
			return 'DEBUG';
		} else if (level === logLevel.TRACE) {
			return 'TRACE';
		}
	}

	/**
	 * 指定された文字列をレベルに変換します。
	 */
	function stringToLevel(str) {
		if (str.match(/^error$/i)) {
			return logLevel.ERROR;
		} else if (str.match(/^warn$/i)) {
			return logLevel.WARN;
		} else if (str.match(/^info$/i)) {
			return logLevel.INFO;
		} else if (str.match(/^debug$/i)) {
			return logLevel.DEBUG;
		} else if (str.match(/^trace$/i)) {
			return logLevel.TRACE;
		} else if (str.match(/^all$/i)) {
			return logLevel.ALL;
		} else if (str.match(/^none$/i)) {
			return logLevel.NONE;
		} else {
			return null;
		}
	}
	;

	/**
	 * トレース情報からトレース結果のオブジェクト取得します。
	 * <ul>
	 * <li>result.all {String} 全てトレースする
	 * <li>result.recent {String} Logクラス/LogTargetクラスのメソッドは省いた最大3件のスタックトーレス"[func1_2 () <- func1_1 () <-
	 * func1 () ...]"
	 * </ul>
	 */
	function getTraceResult(recentTraces, detailTraces) {
		var COUNT = 3;
		var result = {};

		if ($.isArray(recentTraces)) {
			var recent = recentTraces.slice(0, COUNT).join(' <- ');

			if (recentTraces.slice(COUNT).length > 0) {
				recent += ' ...';
			}

			result.recent = recent;
			result.all = detailTraces.join('\n');
		} else {
			result.recent = recentTraces;
			result.all = detailTraces;
		}

		return result;
	}

	/**
	 * 指定されたFunction型のオブジェクトから、名前を取得します。
	 *
	 * @param {Function} fn
	 */
	function getFunctionName(fn) {
		var ret = '';

		if (!fn.name) {
			var regExp = /^\s*function\s*([\w\-\$]+)?\s*\(/i;
			regExp.test(fn.toString());
			ret = RegExp.$1;
		} else {
			ret = fn.name;
		}

		return ret;
	}

	/**
	 * 指定されたFunction型のオブジェクトから、引数の型の一覧を取得します。
	 */
	function parseArgs(args) {
		var argArray = h5.u.obj.argsToArray(args);
		var result = [];

		for ( var i = 0, len = argArray.length; i < len; i++) {
			result.push($.type(argArray[i]));
		}

		return result.join(', ');
	}


	// =========================================================================
	//
	// Body
	//
	// =========================================================================
	/**
	 * コンソールにログを出力するログターゲット
	 *
	 * @name ConsoleLogTarget
	 * @constructor
	 */
	function ConsoleLogTarget() {
	// 空コンストラクタ
	}

	ConsoleLogTarget.prototype = {

		/**
		 * コンソールログターゲットの初期化を行います。
		 *
		 * @memberOf ConsoleLogTarget
		 * @function
		 * @param {Object} param 初期化パラメータ
		 */
		init: function(param) {
		// 今は特定のパラメータはない
		},

		/**
		 * ログをコンソールに出力します。
		 *
		 * @memberOf ConsoleLogTarget
		 * @function
		 * @param {Object} logObj ログ情報を保持するオブジェクト
		 */
		log: function(logObj) {
			if (!window.console) {
				return;
			}

			var args = logObj.args;
			if (!isString(args[0])) {
				this._logObj(logObj);
			} else {
				this._logMsg(logObj);
			}
		},

		/**
		 * 指定された文字列をコンソールに出力します。
		 *
		 * @memberOf ConsoleLogTarget
		 * @private
		 * @function
		 * @param {Object} logObj ログ情報を保持するオブジェクト
		 */
		_logMsg: function(logObj) {
			var args = logObj.args;
			var msg = null;

			if (args.length === 1) {
				msg = args[0];
			} else {
				msg = h5.u.str.format.apply(h5.u.str, args);
			}

			var logMsg = this._getLogPrefix(logObj) + msg;

			if (logObj.logger.enableStackTrace) {
				logMsg += '  [' + logObj.stackTrace.recent + ']';
			}

			if (logObj.logger.enableStackTrace && console.groupCollapsed) {
				console.groupCollapsed(logMsg);
			} else {
				this._consoleOut(logObj.level, logMsg);
			}

			if (logObj.logger.enableStackTrace) {
				// if (console.trace) {
				// console.trace();
				// } else {
				this._consoleOut(logObj.level, logObj.stackTrace.all);
				// }
			}

			if (logObj.logger.enableStackTrace && console.groupEnd) {
				console.groupEnd();
			}
		},

		_consoleOut: function(level, str) {
			var logPrinted = false;

			// 専用メソッドがあればそれを使用して出力
			if ((level == logLevel.ERROR) && console.error) {
				console.error(str);
				logPrinted = true;
			} else if ((level == logLevel.WARN) && console.warn) {
				console.warn(str);
				logPrinted = true;
			} else if ((level == logLevel.INFO) && console.info) {
				console.info(str);
				logPrinted = true;
			} else if ((level == logLevel.DEBUG) && console.debug) {
				console.debug(str);
				logPrinted = true;
			}

			if (!logPrinted && console.log) {
				// this.trace()の場合、または固有メソッドがない場合はlogメソッドで出力
				console.log(str);
			}
		},

		/**
		 * 出力するログのプレフィックスを作成します。
		 *
		 * @memberOf ConsoleLogTarget
		 * @private
		 * @function
		 * @param {Object} logObj ログ情報を保持するオブジェクト
		 * @return ログのプレフィックス
		 */
		_getLogPrefix: function(logObj) {
			return '[' + logObj.levelString + ']' + logObj.date.getHours() + ':'
					+ logObj.date.getMinutes() + ':' + logObj.date.getSeconds() + ','
					+ logObj.date.getMilliseconds() + ': ';
		},

		/**
		 * 指定されたオブジェクトをコンソールに出力します。
		 *
		 * @memberOf ConsoleLogTarget
		 * @private
		 * @function
		 * @param {Object} logObj ログ情報を保持するオブジェクト
		 */
		_logObj: function(logObj) {
			// 専用メソッドがあればそれを使用して出力
			var args = logObj.args;
			var prefix = this._getLogPrefix(logObj);
			args.unshift(prefix);
			if ((logObj.level == logLevel.ERROR) && console.error) {
				this._output(console.error, args);
			} else if ((logObj.level == logLevel.WARN) && console.warn) {
				this._output(console.warn, args);
			} else if ((logObj.level == logLevel.INFO) && console.info) {
				this._output(console.info, args);
			} else if ((logObj.level == logLevel.DEBUG) && console.debug) {
				this._output(console.debug, args);
			} else {
				this._output(console.log, args);
			}
		},

		_output: function(func, args) {
			if (!func.apply) {
				// IEでは、console.log/error/info/warnにapplyがない。
				func(args);
				return;
			}
			// IE以外では、applyを使って呼び出さないと『TypeError:Illegal invocation』が発生する
			func.apply(console, args);
		}
	};

	/**
	 * h5.settings.logにあるログ設定を適用します。
	 *
	 * @function
	 * @name configure
	 * @memberOf h5.log
	 */
	var configure = function() {
		// defaultOutのデフォルト
		var defaultOut = {
			level: 'NONE',
			targets: null
		};

		/* del begin */
		// h5.dev.jsではデフォルトのdefaultOutをログ出力するようにしておく。
		defaultOut = {
			level: 'debug',
			targets: 'console'
		};

		/* del end */

		function compileLogTarget(targets) {
			if (!$.isPlainObject(targets)) {
				throwFwError(ERR_CODE_LOG_TARGET_INVALID);
			}
			for ( var prop in targets) {
				var obj = targets[prop];
				var type = $.type(obj.type);
				// 今は"remote"でもエラーとなる
				if (type !== 'object' && obj.type !== 'console') {
					throwFwError(ERR_CODE_LOG_TARGET_TYPE);
				}
				var compiledTarget = null;
				if (obj.type === 'console') {
					compiledTarget = new ConsoleLogTarget();
				} else {
					// typeがオブジェクトの場合
					var clone = $.extend(true, {}, obj.type);
					compiledTarget = clone;
				}
				if (compiledTarget.init) {
					compiledTarget.init(obj);
				}
				obj.compiledTarget = compiledTarget;
			}
			targets.console = {
				type: 'console',
				compiledTarget: new ConsoleLogTarget()
			};
		}

		var categoryCache = [];
		function compileOutput(_logTarget, out, _dOut) {
			var isDefault = _dOut == null;
			if (!isDefault) {
				var category = out.category;
				if (!isString(category) || $.trim(category).length === 0) {
					throwFwError(ERR_CODE_OUT_CATEGORY_INVALID);
				}
				category = $.trim(category);
				if ($.inArray(category, categoryCache) !== -1) {
					throwFwError(ERR_CODE_CATEGORY_NAMED_MULTIPLE_TIMES, out.category);
				}
				out.compiledCategory = getRegex(category);
				categoryCache.push(category);
			}
			var compiledLevel;
			if (out.level == null) {
				compiledLevel = stringToLevel(isDefault ? defaultOut.level : _dOut.level);
			} else {
				compiledLevel = isString(out.level) ? stringToLevel($.trim(out.level)) : out.level;
			}
			if (typeof compiledLevel !== 'number') {
				throwFwError(ERR_CODE_LEVEL_INVALID, out.level);
			}
			out.compiledLevel = compiledLevel;

			var compiledTargets = [];
			var targets = out.targets;
			if (!isDefault || targets != null) {
				var targetNames = [];
				// targetsの指定は文字列または配列またはnull,undefinedのみ
				if (!(targets == null || $.isArray(targets) || (isString(targets) && $
						.trim(targets).length))) {
					throwFwError(ERR_CODE_LOG_TARGETS_INVALID);
				}
				targets = wrapInArray(targets);
				for ( var i = 0, len = targets.length; i < len; i++) {
					if (!(targets[i] == null || (isString(targets[i]) && $.trim(targets[i]).length))) {
						throwFwError(ERR_CODE_LOG_TARGETS_INVALID);
					}
					var targetName = targets[i];
					if (!targetName) {
						continue;
					}
					if ($.inArray(targetName, targetNames) !== -1) {
						throwFwError(ERR_CODE_LOG_TARGETS_NAMED_MULTIPLE_TIMES, targetName);
					}
					var l = _logTarget[targetName];
					if (!l) {
						throwFwError(ERR_CODE_LOG_TARGETS_IS_NONE, targetName);
					}
					targetNames.push(targetName);
					compiledTargets.push(l.compiledTarget);
				}
				if (!isDefault) {
					var defaultTargets = _dOut.targets;
					if (defaultTargets != null) {
						defaultTargets = wrapInArray(defaultTargets);
						for ( var i = 0, len = defaultTargets.length; i < len; i++) {
							var targetName = defaultTargets[i];
							if ($.inArray(targetName, targetNames) === -1) {
								compiledTargets.push(_dOut.compiledTargets[i]);
								targetNames.push(targetName);
							}
						}
					}
				}
			}
			out.compiledTargets = compiledTargets;
		}

		compiledLogSettings = $.extend(true, {}, h5.settings.log ? h5.settings.log : {
			defaultOut: defaultOut
		});
		var logTarget = compiledLogSettings.target;
		if (!logTarget) {
			logTarget = {};
			compiledLogSettings.target = logTarget;
		}
		compileLogTarget(logTarget);
		var dOut = compiledLogSettings.defaultOut;
		if (!dOut) {
			dOut = defaultOut;
			compiledLogSettings.defaultOut = dOut;
		}
		compileOutput(logTarget, dOut);
		var outs = compiledLogSettings.out;
		if (outs) {
			outs = wrapInArray(outs);
			for ( var i = 0, len = outs.length; i < len; i++) {
				compileOutput(logTarget, outs[i], dOut);
			}
		}
	};

	/**
	 * ログを生成するクラス
	 *
	 * @class
	 * @name Log
	 */
	function Log(category) {
		// categoryの指定が文字列以外、または空文字、空白文字ならエラー。
		if (!isString(category) || $.trim(category).length === 0) {
			throwFwError(ERR_CODE_CATEGORY_INVALID);
		}

		/**
		 * ログカテゴリ
		 *
		 * @memberOf Log
		 * @type String
		 * @name category
		 */
		this.category = $.trim(category);
	}

	Log.prototype = {
		/**
		 * ログ出力時、スタックトレース(関数呼び出し関係)を表示するか設定します。<br>
		 * (デフォルト: false[表示しない])
		 *
		 * @type Boolean
		 * @memberOf Log
		 */
		enableStackTrace: false,

		/**
		 * ログに表示するトレースの最大数を設定します。<br>
		 * (デフォルト:10)
		 *
		 * @type Number
		 * @memberOf Log
		 */
		maxStackSize: 10,

		/**
		 * LEVEL.ERROR レベルのログを出力します。
		 * <p>
		 * 引数がObject型の場合はオブジェクト構造を、String型の場合は引数の書式に合わせてログを出力します。
		 * <p>
		 * 書式については、h5.u.str.format関数のドキュメントを参照下さい。
		 *
		 * @see h5.u.str.format
		 * @memberOf Log
		 * @function
		 * @param {Any} var_args コンソールに出力する内容
		 */
		error: function(var_args) {
			this._log(logLevel.ERROR, arguments, this.error);
		},

		/**
		 * LEVEL.WARN レベルのログを出力します。
		 * <p>
		 * 引数がObject型の場合はオブジェクト構造を、String型の場合は引数の書式に合わせてログを出力します。
		 * <p>
		 * 書式については、h5.u.str.format関数のドキュメントを参照下さい。
		 *
		 * @see h5.u.str.format
		 * @memberOf Log
		 * @function
		 * @param {Any} var_args コンソールに出力する内容
		 */
		warn: function(var_args) {
			this._log(logLevel.WARN, arguments, this.warn);
		},

		/**
		 * LEVEL.INFO レベルのログを出力します。
		 * <p>
		 * 引数がObject型の場合はオブジェクト構造を、String型の場合は引数の書式に合わせてログを出力します。
		 * <p>
		 * 書式については、h5.u.str.format関数のドキュメントを参照下さい。
		 *
		 * @see h5.u.str.format
		 * @memberOf Log
		 * @function
		 * @param {Any} var_args コンソールに出力する内容
		 */
		info: function(var_args) {
			this._log(logLevel.INFO, arguments, this.info);
		},

		/**
		 * LEVEL.DEBUG レベルのログを出力します。
		 * <p>
		 * 引数がObject型の場合はオブジェクト構造を、String型の場合は引数の書式に合わせてログを出力します。
		 * <p>
		 * 書式については、h5.u.str.format関数のドキュメントを参照下さい。
		 *
		 * @see h5.u.str.format
		 * @function
		 * @memberOf Log
		 * @param {Any} var_args コンソールに出力する内容
		 */
		debug: function(var_args) {
			this._log(logLevel.DEBUG, arguments, this.debug);
		},

		/**
		 * LEVEL.TRACE レベルのログを出力します。
		 * <p>
		 * 引数がObject型の場合はオブジェクト構造を、String型の場合は引数の書式に合わせてログを出力します。
		 * <p>
		 * 書式については、h5.u.str.format関数のドキュメントを参照下さい。
		 *
		 * @see h5.u.str.format
		 * @memberOf Log
		 * @function
		 * @param {Any} var_args コンソールに出力する内容
		 */
		trace: function(var_args) {
			this._log(logLevel.TRACE, arguments, this.trace);
		},

		/**
		 * スタックトレース(関数呼び出し関係)を取得します。
		 *
		 * @private
		 * @memberOf Log
		 * @function
		 * @param fn {Function} トレース対象の関数
		 * @returns {Object} スタックトレース<br>
		 *
		 * <pre>
		 * {
		 *   all: 全てトレースした文字列,
		 *   recent: Logクラス/LogTargetクラスのメソッドは省いた最大3件トレースした文字列
		 *    &quot;[func1_2 () &lt;- func1_1 () &lt;- func1 () ...]&quot;
		 * }
		 * </pre>
		 */
		_traceFunctionName: function(fn) {
			var e = new Error();
			var errMsg = e.stack || e.stacktrace;
			var traces = [];
			/** @type Object */
			var result = {};

			if (errMsg) {
				// トレースされたログのうち、トレースの基点から3メソッド分(_traceFunction、_log、
				// debug|info|warn|error|trace)はログに出力しない。
				var DROP_TRACE_COUNT = 3;

				// Chrome, FireFox, Opera
				traces = errMsg.replace(/\r\n/, '\n').replace(
						/at\b|@|Error\b|\t|\[arguments not available\]/ig, '').replace(
						/(http|https|file):.+[0-9]/g, '').replace(/ +/g, ' ').split('\n');

				var ret = null;
				traces = $.map(traces, function(value) {
					if (value.length === 0) {
						ret = null; // 不要なデータ(Chromeは配列の先頭, FireFoxは配列の末尾に存在する)
					} else if ($.trim(value) === '') {
						ret = '{anonymous}'; // ログとして出力されたが関数名が無い
					} else {
						ret = $.trim(value);
					}
					return ret;
				});

				result = getTraceResult(traces.slice(DROP_TRACE_COUNT, traces.length), traces
						.slice(0, this.maxStackSize));
			} else {
				// IE, Safari
				var currentCaller = fn.caller;
				var index = 0;

				if (!currentCaller) {
					getTraceResult('{unable to trace}', '{unable to trace}');
				} else {
					while (true) {
						var argStr = parseArgs(currentCaller.arguments);
						var funcName = getFunctionName(currentCaller);

						if (funcName) {
							traces.push('{' + funcName + '}(' + argStr + ')');
						} else {
							if (!currentCaller.caller) {
								traces.push('{root}(' + argStr + ')');
							} else {
								traces.push('{anonymous}(' + argStr + ')');
							}
						}

						if (!currentCaller.caller || index >= this.maxStackSize) {
							result = getTraceResult(traces, traces);
							break;
						}

						currentCaller = currentCaller.caller;
						index++;
					}
				}
			}
			return result;
		},

		/**
		 * ログ情報を保持するオブジェクトに以下の情報を付与し、コンソールまたはリモートサーバにログを出力します。
		 * <ul>
		 * <li>時刻
		 * <li>ログの種別を表す文字列(ERROR, WARN, INFO, DEBUG, TRACE, OTHER)
		 * </ul>
		 *
		 * @private
		 * @memberOf Log
		 * @function
		 * @param {Number} level ログレベル
		 * @param {Arguments} args 引数
		 * @param {Function} func 元々呼ばれた関数
		 */
		_log: function(level, args, func) {
			var logObj = {
				level: level,
				args: h5.u.obj.argsToArray(args),
				stackTrace: this.enableStackTrace ? this._traceFunctionName(func) : ''
			};

			var outs = compiledLogSettings.out;
			var defaultOut = compiledLogSettings.defaultOut;

			var targetOut = null;
			if (outs) {
				outs = wrapInArray(outs);
				for ( var i = 0, len = outs.length; i < len; i++) {
					var out = outs[i];
					if (!out.compiledCategory.test(this.category)) {
						continue;
					}
					targetOut = out;
					break;
				}
			}
			if (!targetOut) {
				targetOut = defaultOut;
			}
			var levelThreshold = targetOut.compiledLevel;
			var logTarget = targetOut.compiledTargets;

			if (level < levelThreshold || levelThreshold < 0) {
				return;
			}

			logObj.logger = this;
			logObj.date = new Date();
			logObj.levelString = this._levelToString(level);

			if (!logTarget || logTarget.length === 0) {
				return;
			}

			for ( var i = 0, len = logTarget.length; i < len; i++) {
				logTarget[i].log(logObj);
			}
		},

		/**
		 * ログレベルを判定して、ログの種別を表す文字列を取得します。
		 *
		 * @private
		 * @memberOf Log
		 * @function
		 * @param {Object} level
		 */
		_levelToString: levelToString
	};

	/**
	 * ロガーを作成します。
	 *
	 * @param {String} [category=null] カテゴリ.
	 * @returns {Log} ロガー.
	 * @name createLogger
	 * @function
	 * @memberOf h5.log
	 * @see Log
	 */
	var createLogger = function(category) {
		return new Log(category);
	};

	// =============================
	// Expose to window
	// =============================

	/**
	 * @namespace
	 * @name log
	 * @memberOf h5
	 */
	h5.u.obj.expose('h5.log', {
		createLogger: createLogger,
		configure: configure
	});
})();


/* ------ (h5) ------ */
(function() {
	// =========================================================================
	//
	// Constants
	//
	// =========================================================================

	// =============================
	// Production
	// =============================

	// =============================
	// Development Only
	// =============================

	/* del begin */

	/* del end */


	// =========================================================================
	//
	// Cache
	//
	// =========================================================================
	// =========================================================================
	//
	// Privates
	//
	// =========================================================================
	// =============================
	// Variables
	// =============================
	// =============================
	// Functions
	// =============================
	/**
	 * すべてのアスペクト設定をコンパイルします。
	 *
	 * @param {Object|Object[]} aspects アスペクト設定
	 */
	function compileAspects(aspects) {
		var compile = function(aspect) {
			if (aspect.target) {
				aspect.compiledTarget = getRegex(aspect.target);
			}
			if (aspect.pointCut) {
				aspect.compiledPointCut = getRegex(aspect.pointCut);
			}
			return aspect;
		};
		h5.settings.aspects = $.map(wrapInArray(aspects), function(n) {
			return compile(n);
		});
	}


	// =========================================================================
	//
	// Body
	//
	// =========================================================================
	/**
	 * 設定を格納するh5.settingsオブジェクト
	 *
	 * @name settings
	 * @memberOf h5
	 * @namespace
	 */
	h5.u.obj.ns('h5.settings');

	h5.settings = {

		/**
		 * failコールバックが設定されていない時にrejectされた場合に発動する共通ハンドラ.
		 *
		 * @memberOf h5.settings
		 * @type Function
		 */
		commonFailHandler: null,

		/**
		 * コントローラ、ロジックへのアスペクト
		 *
		 * @memberOf h5.settings
		 * @type Aspect|Aspect[]
		 */
		aspects: null,

		/**
		 * ログの設定を行います。
		 *
		 * @memberOf h5.settings
		 * @type Object
		 */
		log: null
	};

	// h5preinitでglobalAspectsの設定をしている関係上、別ファイルではなく、ここに置いている。
	/**
	 * 実行時間の計測を行うインターセプタ。
	 *
	 * @function
	 * @param {Function} invocation 次に実行する関数
	 * @returns {Any} invocationの戻り値
	 * @memberOf h5.core.interceptor
	 */
	var lapInterceptor = h5.u.createInterceptor(function(invocation, data) {
		// 開始時間をdataオブジェクトに格納
		data.start = new Date();
		// invocationを実行
		return invocation.proceed();
	}, function(invocation, data) {
		// 終了時間を取得
		var end = new Date();
		// ログ出力
		this.log.info('{0} "{1}": {2}ms', this.__name, invocation.funcName, (end - data.start));
	});

	/**
	 * イベントコンテキストに格納されているものをコンソールに出力するインターセプタ。
	 *
	 * @function
	 * @param {Function} invocation 次に実行する関数
	 * @returns {Any} invocationの戻り値
	 * @memberOf h5.core.interceptor
	 */
	var logInterceptor = h5.u.createInterceptor(function(invocation) {
		this.log.info('{0} "{1}"が開始されました。', this.__name, invocation.funcName);
		this.log.info(invocation.args);
		return invocation.proceed();
	}, function(invocation) {
		this.log.info('{0} "{1}"が終了しました。', this.__name, invocation.funcName);
	});

	/**
	 * invocationからあがってきたエラーを受け取りcommonFailHandlerに処理を任せるインターセプタ。
	 *
	 * @param {Function} invocation 次に実行する関数
	 * @returns {Any} invocationの戻り値
	 * @memberOf h5.core.interceptor
	 */
	var errorInterceptor = function(invocation) {
		var ret = null;
		try {
			ret = invocation.proceed();
		} catch (e) {
			if (h5.settings.commonFailHandler && $.isFunction(h5.settings.commonFailHandler)) {
				h5.settings.commonFailHandler.call(null, e);
			}
		}
		return ret;
	};

	// ここで公開しないとh5preinit時にデフォルトインターセプタが定義されていないことになる
	/**
	 * @name interceptor
	 * @memberOf h5.core
	 * @namespace
	 */
	h5.u.obj.expose('h5.core.interceptor', {
		lapInterceptor: lapInterceptor,
		logInterceptor: logInterceptor,
		errorInterceptor: errorInterceptor
	});

	// h5preinitイベントをトリガ.
	$(window.document).trigger('h5preinit');

	if (h5.settings.aspects) {
		compileAspects(h5.settings.aspects);
	}

	// ログ設定の適用
	h5.log.configure();

	// =============================
	// Expose to window
	// =============================
	/* del begin */
	// テストのために公開している。
	h5.u.obj.expose('h5.core', {
		__compileAspects: compileAspects
	});
	/* del end */
})();


/* ------ h5.env ------ */
(function() {
	// =========================================================================
	//
	// Constants
	//
	// =========================================================================

	// =============================
	// Production
	// =============================

	// =============================
	// Development Only
	// =============================

	/* del begin */

	/* del end */


	// =========================================================================
	//
	// Cache
	//
	// =========================================================================
	// =========================================================================
	//
	// Privates
	//
	// =========================================================================
	// =============================
	// Variables
	// =============================
	// =============================
	// Functions
	// =============================
	function check(ua) {
		/**
		 * iPhoneであるかどうかを表します。 Chrome For iOS など、標準ブラウザでなくてもiPhoneであれば、trueです。
		 *
		 * @name isiPhone
		 * @type Boolean
		 * @memberOf h5.env.ua
		 */
		var isiPhone = !!ua.match(/iPhone/i);

		/**
		 * iPadであるかどうかを表します。 Chrome For iOS など、標準ブラウザでなくてもiPhoneであれば、trueです。
		 *
		 * @name isiPad
		 * @type Boolean
		 * @memberOf h5.env.ua
		 */
		var isiPad = !!ua.match(/iPad/i);

		/**
		 * iOSであるかどうかを表します。 isiPhoneまたはisiPadがtrueであればtrueです。
		 *
		 * @name isiOS
		 * @type Boolean
		 * @memberOf h5.env.ua
		 */
		var isiOS = isiPhone || isiPad;

		/**
		 * Androidであるかどうかを表します。 Androidであれば標準ブラウザでなくても、trueです。
		 *
		 * @name isAndroid
		 * @type Boolean
		 * @memberOf h5.env.ua
		 */
		var isAndroid = !!ua.match(/android/i);

		/**
		 * Windows Phoneであるかどうかを表します。
		 *
		 * @name isWindowsPhone
		 * @type Boolean
		 * @memberOf h5.env.ua
		 */
		var isWindowsPhone = !!ua.match(/Windows Phone/i);

		/**
		 * ブラウザがInternet Explorerであるかどうかを表します。
		 *
		 * @name isIE
		 * @type Boolean
		 * @memberOf h5.env.ua
		 */
		var isIE = !!ua.match(/MSIE/);

		/**
		 * ブラウザがFirefoxであるかどうかを表します。 モバイル端末のFirefoxでもtrueです。
		 *
		 * @name isFirefox
		 * @type Boolean
		 * @memberOf h5.env.ua
		 */
		var isFirefox = !!ua.match(/Firefox/i);

		/**
		 * ブラウザがGoogle Chromeであるかどうかを表します。 Chromeモバイル、Chrome iOS の場合もtrueです。<br />
		 * 以下の文字列が含まれる場合にtrueになります。<br />
		 * <ul>
		 * <li>Chrome (Chrome for Android / Desktop)</li>
		 * <li>CrMo (Chrome for Android)</li>
		 * <li>CriOS (Chrome for iOS)</li>
		 * </ul>
		 *
		 * @name isChrome
		 * @type Boolean
		 * @memberOf h5.env.ua
		 */
		var isChrome = !!ua.match(/Chrome/i) || !!ua.match(/CrMo/) || !!ua.match(/CriOS/);

		/**
		 * ブラウザがSafariであるかどうかを表します。 iOSのSafariの場合もtrueです。
		 *
		 * @name isSafari
		 * @type Boolean
		 * @memberOf h5.env.ua
		 */
		var isSafari = !isAndroid && !!ua.match(/Safari/i) && !isChrome;

		/**
		 * レンダリングエンジンがWebkitであるかどうかを表します。
		 *
		 * @name isWebkit
		 * @type Boolean
		 * @memberOf h5.env.ua
		 */
		var isWebkit = !!ua.match(/Webkit/i);

		/**
		 * ブラウザがOperaであるかどうかを表します。 モバイル、iOSのOperaの場合もtrueです。
		 *
		 * @name isOpera
		 * @type Boolean
		 * @memberOf h5.env.ua
		 */
		var isOpera = !!ua.match(/Opera/i);
		/**
		 * ブラウザがAndroid標準ブラウザであるかどうかを表します。
		 *
		 * @name isAndroidDefaultBrowser
		 * @type Boolean
		 * @memberOf h5.env.ua
		 */
		var isAndroidDefaultBrowser = isAndroid && !!ua.match(/Safari/i) && !isChrome;

		/**
		 * スマートフォンであるかどうかを表します。<br />
		 * isiPhone, isWindowsPhoneがtrueならtrueとなります。<br />
		 * Androidの場合、判定は以下の場合にtrueとなります。
		 * <ul>
		 * <li>Android標準ブラウザ、かつユーザーエージェントに"Mobile"を含む、かつ"SC-01C"を含まない。 </li>
		 * <li>ユーザーエージェントに"Fennec"を含む。</li>
		 * <li>ユーザーエージェントに"Opera Mobi"を含む。</li>
		 * </ul>
		 *
		 * @name isSmartPhone
		 * @type Boolean
		 * @memberOf h5.env.ua
		 */
		var isSmartPhone = !!(isiPhone || isWindowsPhone
				|| (isAndroidDefaultBrowser && ua.match(/Mobile/) && !ua.match(/SC-01C/))
				|| (isAndroid && isChrome && ua.match(/Mobile/)) || ua.match(/Fennec/i) || ua
				.match(/Opera Mobi/i));

		/**
		 * タブレットであるかどうかを表します。<br />
		 * isiPadがtrueならtrueとなります。<br />
		 * Androidの場合、判定は以下の場合にtrueとなります。
		 * <ul>
		 * <li>Android標準ブラウザ、かつユーザーエージェントに"Mobile"を含まない。ただし"SC-01C"を含む場合はtrue。 </li>
		 * <li>ユーザーエージェントに"Fennec"を含む。</li>
		 * <li>ユーザーエージェントに"Opera Tablet"を含む。</li>
		 * </ul>
		 *
		 * @name isTablet
		 * @type Boolean
		 * @memberOf h5.env.ua
		 */
		var isTablet = !!(isiPad || (isAndroidDefaultBrowser && !ua.match(/Mobile/))
				|| (isAndroid && isChrome && !ua.match(/Mobile/)) || ua.match(/SC-01C/)
				|| ua.match(/Fennec/i) || ua.match(/Opera Tablet/i));

		/**
		 * PCであるかどうかを表します。 isSmartPhoneとisTabletがいずれもfalseの場合にtrueです。
		 *
		 * @name isDesktop
		 * @type Boolean
		 * @memberOf h5.env.ua
		 */
		var isDesktop = !isSmartPhone && !isTablet;

		/**
		 * OSのバージョンを表します。<br />
		 * h5.env.ua.isDesktopがtrueである場合、値はnullになります。
		 *
		 * @name osVersion
		 * @type Number
		 * @memberOf h5.env.ua
		 */
		var osVersion = null;

		/**
		 * OSのフルバージョンを表します。<br />
		 * h5.env.ua.isDesktopがtrueである場合、値はnullになります。
		 *
		 * @name osVersionFull
		 * @type String
		 * @memberOf h5.env.ua
		 */
		var osVersionFull = null;

		var getiOSVersion = function(pre, post) {
			return $.trim(ua.substring(ua.indexOf(pre) + pre.length, ua.indexOf(post))).split('_');
		};

		var getVersion = function(target, end, ignoreCase) {
			var r = ignoreCase === false ? new RegExp(target + end) : new RegExp(target + end, 'i');
			return $.trim(ua.match(r));
		};

		var spaceSplit = function(target, ignoreCase) {
			var v = getVersion(target, '[^;)]*', ignoreCase).split(' ');
			if (v.length === 1)
				return '';
			return v[v.length - 1];
		};

		var slashSplit = function(target, ignoreCase) {
			var v = getVersion(target, '[^;) ]*', ignoreCase).split('/');
			if (v.length === 1)
				return '';
			return v[v.length - 1];
		};

		var getMainVersion = function(target) {
			return parseInt(target.split('.')[0]);
		};

		if (isiPhone) {
			var s = getiOSVersion('iPhone OS', 'like');
			osVersion = parseInt(s[0]);
			osVersionFull = s.join('.');
		} else if (isiPad) {
			var s = getiOSVersion('CPU OS', 'like');
			osVersion = parseInt(s[0]);
			osVersionFull = s.join('.');
		} else if (isAndroid && isFirefox) {
			// FennecはAndroidのバージョンを取得することができない。
		} else if (isAndroid) {
			var s = spaceSplit('Android');
			osVersion = getMainVersion(s);
			osVersionFull = s;
		} else if (isWindowsPhone) {
			var s = spaceSplit('Windows Phone OS');
			if (!s) {
				s = spaceSplit('Windows Phone');
			}
			osVersion = getMainVersion(s);
			osVersionFull = s;
		}

		// Operaのuaに'MSIE'が入っているとき用に、isIE && isOperaならisIEをfalseにする
		if (isIE && isOpera) {
			isIE = false;
		}

		// デスクトップの場合。osVersion, osVersionFullはnull
		/**
		 * ブラウザのバージョンを表します。
		 *
		 * @name browserVersion
		 * @type Number
		 * @memberOf h5.env.ua
		 */
		var browserVersion = null;

		/**
		 * ブラウザのフルバージョンを表します。
		 *
		 * @name browserVersionFull
		 * @type String
		 * @memberOf h5.env.ua
		 */
		var browserVersionFull = null;

		if (isiOS || (isAndroid && isAndroidDefaultBrowser)) {
			browserVersion = osVersion;
			browserVersionFull = osVersionFull;
		} else {
			var version = null;
			if (isIE) {
				version = spaceSplit('MSIE', false);
			} else if (isChrome) {
				version = slashSplit('Chrome', false);
				if (!version) {
					version = slashSplit('CrMo', false);
				}
			} else if (isSafari) {
				version = slashSplit('Version');
			} else if (isFirefox) {
				version = slashSplit('Firefox');
			} else if (isOpera) {
				version = slashSplit('Version');
				if (!version) {
					version = slashSplit('Opera');
				}
				if (!version) {
					version = spaceSplit('Opera');
				}
			}
			if (version) {
				browserVersion = getMainVersion(version);
				browserVersionFull = version;
			}
		}

		return {
			osVersion: osVersion,
			osVersionFull: osVersionFull,
			browserVersion: browserVersion,
			browserVersionFull: browserVersionFull,
			isiPhone: isiPhone,
			isiPad: isiPad,
			isiOS: isiOS,
			isAndroid: isAndroid,
			isWindowsPhone: isWindowsPhone,
			isIE: isIE,
			isFirefox: isFirefox,
			isChrome: isChrome,
			isSafari: isSafari,
			isOpera: isOpera,
			isAndroidDefaultBrowser: isAndroidDefaultBrowser,
			isSmartPhone: isSmartPhone,
			isTablet: isTablet,
			isDesktop: isDesktop,
			isWebkit: isWebkit
		};
	}

	// =========================================================================
	//
	// Body
	//
	// =========================================================================

	// =============================
	// Expose to window
	// =============================
	/**
	 * @namespace
	 * @name env
	 * @memberOf h5
	 */
	/**
	 * ユーザーエージェントからOS、ブラウザを判別します。<br />
	 * 例えば、iPhoneのSafariかどうかを判別したい場合は、<br />
	 * <br />
	 * h5.env.ua.isiPhone && h5.env.ua.isSafari<br />
	 * <br />
	 * で判別することができます。<br />
	 * <br />
	 * 機能の有無を判別したい場合は、基本的にはこれらのプロパティを使わず、機能の有無でチェックしてください。<br />
	 * 例えば『Geolocationが使えるか』を判別したい場合、h5.api.geo.isSupportedで判別できます。<br />
	 *
	 * @namespace
	 * @name ua
	 * @memberOf h5.env
	 */
	h5.u.obj.expose('h5.env', {
		ua: check(navigator.userAgent)
	});

	/* del begin */
	// テストのためにグローバルに公開。プリプロセッサで削除される。
	h5.u.obj.expose('h5.env', {
		__check: check
	});
	/* del end */
})();


/* ------ h5.async ------ */
(function() {
	// =========================================================================
	//
	// Constants
	//
	// =========================================================================

	// =============================
	// Production
	// =============================

	/**
	 * h5.async.loopの第一引数に配列以外のものが渡されたときに発生するエラー
	 */
	var ERR_CODE_NOT_ARRAY = 5000;

	// =============================
	// Development Only
	// =============================

	var fwLogger = h5.log.createLogger('h5.async');

	/* del begin */
	var FW_LOG_H5_WHEN_INVALID_PARAMETER = 'h5.async.when: 引数にpromiseオブジェクトでないものが含まれています。';

	/**
	 * 各エラーコードに対応するメッセージ
	 */
	var errMsgMap = {};
	errMsgMap[ERR_CODE_NOT_ARRAY] = 'h5.async.each() の第1引数は配列のみを扱います。';

	// メッセージの登録
	addFwErrorCodeMap(errMsgMap);
	/* del end */


	// =========================================================================
	//
	// Cache
	//
	// =========================================================================
	// =========================================================================
	//
	// Privates
	//
	// =========================================================================
	/**
	 * jQueryのDeferred関数
	 *
	 * @private
	 */
	var jQueryDeferred = $.Deferred;
	// =============================
	// Variables
	// =============================
	// =============================
	// Functions
	// =============================
	// =========================================================================
	//
	// Body
	//
	// =========================================================================
	/**
	 * 登録された共通のエラー処理を実行できるDeferredオブジェクトを返します。<br>
	 * Deferredに notify() / notifyWith() / progress() メソッドがない場合は、追加したオブジェクトを返します。
	 *
	 * @returns {Deferred} Deferredオブジェクト
	 * @name deferred
	 * @function
	 * @memberOf h5.async
	 */
	var deferred = function() {
		var dfd = jQueryDeferred();
		// jQuery1.6.xにはDeferred.notify/notifyWith/progressがない
		if (!dfd.notify && !dfd.notifyWith && !dfd.progress) {
			// 既にnorify/notifyWithが呼ばれたかどうかのフラグ
			var notified = false;
			// 最後に指定された実行コンテキスト
			var lastNotifyContext = null;
			// 最後に指定されたパラメータ
			var lastNotifyParam = null;
			// progressCallbacksを格納するための配列
			dfd.__h5__progressCallbacks = [];
			// progressCallbacksに対応したprogressFilterの配列を格納するための配列
			dfd.__h5__progressFilters = [];

			var progress = function(progressCallback) {
				// 既にnorify/notifyWithが呼ばれていた場合、jQuery1.7.xの仕様と同じにするためにコールバックの登録と同時に実行する必要がある
				var filters = this.__h5__progressPipeFilters;
				if (notified) {
					var params = lastNotifyParam;
					// pipe()でprogressFilterが登録されいたら値をフィルタに通す
					if (filters && filters.length > 0) {
						for ( var i = 0, fLen = filters.length; i < fLen; i++) {
							params = filters[i].apply(this, wrapInArray(params));
						}
					}
					if (params !== lastNotifyParam) {
						params = wrapInArray(params);
					}
					progressCallback.apply(lastNotifyContext, params);
				}
				dfd.__h5__progressCallbacks.push(progressCallback);
				dfd.__h5__progressFilters.push(filters);
				return this;
			};
			dfd.progress = progress;
			var originalPromise = dfd.promise;
			dfd.promise = function(obj) {
				var promise = originalPromise.call(this, obj);
				// プロミスにprogress()を追加
				promise.progress = progress;
				return promise;
			};

			dfd.notify = function(/* var_args */) {
				notified = true;
				if (arguments.length !== -1) {
					lastNotifyContext = this;
					lastNotifyParam = h5.u.obj.argsToArray(arguments);
				}
				var callbacks = dfd.__h5__progressCallbacks;
				var filters = dfd.__h5__progressFilters;
				var args = h5.u.obj.argsToArray(arguments);
				// progressコールバックが登録されていたら全て実行する
				if (callbacks.length > 0) {
					for ( var i = 0, callbackLen = callbacks.length; i < callbackLen; i++) {
						var params = args;
						// pipe()でprogressFilterが登録されいたら値をフィルタに通す
						if (filters[i] && filters[i].length > 0) {
							for ( var j = 0, fLen = filters[i].length; j < fLen; j++) {
								params = filters[i][j].apply(this, wrapInArray(params));
							}
						}
						if (params !== arguments) {
							params = wrapInArray(params);
						}
						callbacks[i].apply(this, params);
					}
				}
				return this;
			};

			dfd.notifyWith = function(context, args) {
				notified = true;
				lastNotifyContext = context;
				lastNotifyParam = args;
				var callbacks = this.__h5__progressCallbacks;
				var filters = this.__h5__progressFilters;
				// progressコールバックが登録されていたら全て実行する
				if (callbacks.length > 0) {
					for ( var i = 0, callbackLen = callbacks.length; i < callbackLen; i++) {
						var params = args;
						// pipe()でprogressFilterが登録されいたら値をフィルタに通す
						if (filters[i] && filters[i].length > 0) {
							for ( var j = 0, fLen = filters[i].length; j < fLen; j++) {
								params = filters[i][j].apply(this, wrapInArray(params));
							}
						}
						if (params !== args) {
							params = wrapInArray(params);
						}
						callbacks[i].apply(context, params);
					}
				}
				return this;
			};

			var lastPointPipe = dfd.pipe;
			dfd.pipe = function(doneFilter, failFilter, progressFilter) {
				// pipe()の戻り値であるfilteredは元のDeferredオブジェクトとはインスタンスが異なる
				var filtered = lastPointPipe.call(this, doneFilter, failFilter);
				if (progressFilter) {
					if (!this.__h5__progressPipeFilters) {
						filtered.__h5__progressPipeFilters = [progressFilter];
					} else {
						filtered.__h5__progressPipeFilters = this.__h5__progressPipeFilters
								.concat([progressFilter]);
					}
				}
				lastPointPipe = filtered.pipe;
				filtered.pipe = dfd.pipe;
				filtered.progress = dfd.progress;
				return filtered;
			};
		}
		// failコールバックが1つ以上登録されたかどうかのフラグ
		var existFailHandler = false;
		//commonFailHandlerが発火済みかどうかのフラグ
		var isCommonFailHandlerFired = false;

		var originalFail = dfd.fail;
		var fail = function(/* var_args */) {
			if (arguments.length > 0) {
				existFailHandler = true;
			}
			return originalFail.apply(this, arguments);
		};
		dfd.fail = fail;

		var originalAlways = dfd.always;
		var always = function(/* var_args */) {
			if (arguments.length > 0) {
				existFailHandler = true;
			}
			return originalAlways.apply(this, arguments);
		};
		dfd.always = always;

		var then = function(doneCallbacks, failCallbacks, progressCallbacks) {
			if (doneCallbacks) {
				this.done.apply(this, wrapInArray(doneCallbacks));
			}
			if (failCallbacks) {
				this.fail.apply(this, wrapInArray(failCallbacks));
			}
			if (progressCallbacks) {
				this.progress.apply(this, wrapInArray(progressCallbacks));
			}
			return this;
		};
		dfd.then = then;

		var originalReject = dfd.reject;
		var reject = function(/* var_args */) {
			var commonFailHandler = h5.settings.commonFailHandler;
			// failコールバックが1つもない、かつcommonFailHandlerがある場合は、commonFailHandlerを登録する
			if (!existFailHandler && commonFailHandler && !isCommonFailHandlerFired) {
				originalFail.call(this, commonFailHandler);
				isCommonFailHandlerFired = true;
			}
			return originalReject.apply(this, arguments);
		};
		dfd.reject = reject;
		var originalRejectWith = dfd.rejectWith;
		var rejectWith = function(/* var_args */) {
			var commonFailHandler = h5.settings.commonFailHandler;
			// failコールバックが1つもない、かつcommonFailHandlerがある場合は、commonFailHandlerを登録する
			if (!existFailHandler && commonFailHandler && !isCommonFailHandlerFired) {
				originalFail.call(this, commonFailHandler);
				isCommonFailHandlerFired = true;
			}
			return originalRejectWith.apply(this, arguments);
		};
		dfd.rejectWith = rejectWith;
		var p = dfd.promise;
		dfd.promise = function(obj) {
			var promise = p.call(this, obj);
			promise.always = always;
			promise.then = then;
			promise.fail = fail;
			return promise;
		};
		return dfd;
	};

	/**
	 * オブジェクトがPromiseオブジェクトであるかどうかを返します。<br />
	 * オブジェクトがDeferredオブジェクトの場合、falseが返ります。
	 *
	 * @param {Object} object オブジェクト
	 * @returns {Boolean} オブジェクトがPromiseオブジェクトであるかどうか
	 * @name isPromise
	 * @function
	 * @memberOf h5.async
	 */
	var isPromise = function(object) {
		return !!object && object.done && object.fail && !object.resolve && !object.reject;
	};

	/**
	 * 指定された回数ごとにループを抜けブラウザに制御を戻すユーティリティメソッドです。
	 *
	 * @param {Any[]} array 配列
	 * @param {Function} callback コールバック関数。<br />
	 *            コールバックには引数として現在のインデックス、現在の値、ループコントローラが渡されます。<br />
	 *            callback(index, value, loopControl) <br />
	 *            loopControlは以下の3つのメソッドを持っています。<br />
	 *            <ul>
	 *            <li>pause - 処理の途中でポーズをかけます。</li>
	 *            <li>resume - ポーズを解除し処理を再開します。</li>
	 *            <li>stop - 処理を中断します。1度stopで中断すると再開することはできません。</li>
	 *            </ul>
	 * @param {Number} [suspendOnTimes=20] 何回ごとにループを抜けるか。デフォルトは20回です。
	 * @returns {Promise} Promiseオブジェクト
	 * @name loop
	 * @function
	 * @memberOf h5.async
	 */
	var loop = function(array, callback, suspendOnTimes) {
		if (!$.isArray(array)) {
			throwFwError(ERR_CODE_NOT_ARRAY);
		}
		var dfd = deferred();
		// 何回ごとにループを抜けるか。デフォルトは20回
		var st = $.type(suspendOnTimes) === 'number' ? suspendOnTimes : 20;
		var userReject = false;
		var index = 0;
		var len = array.length;
		var execute,loopControl = null;
		var each = function() {
			if (index === len) {
				dfd.resolve(array);
				return;
			} else if (userReject) {
				dfd.reject(array);
				return;
			}
			var ret = callback.call(array, index, array[index], loopControl);
			index++;
			if (isPromise(ret)) {
				ret.done(function() {
					execute();
				}).fail(function() {
					userReject = true;
					execute();
				});
			} else {
				execute();
			}
		};
		var async = function() {
			setTimeout(function() {
				var i = index - 1;
				if (index > 0) {
					dfd.notify({
						data: array,
						index: i,
						value: array[i]
					});
				}
				each();
			}, 0);
		};
		var pause = false;
		execute = function() {
			if (pause) {
				return;
			}
			index % st === 0 ? async() : each();
		};
		var stopFlag = false;
		loopControl = {
			resume: function() {
				if (!stopFlag && pause) {
					pause = false;
					execute();
				}
			},
			pause: function() {
				pause = true;
			},
			stop: function() {
				stopFlag = true;
				dfd.resolve(array);
			}
		};
		async();
		return dfd.promise();
	};

	/**
	 * 引数に指定した１つ以上のPromiseオブジェクトに基づいて、コールバックメソッドを実行します。
	 * <p>
	 * 引数に指定されたPromiseオブジェクトの挙動によって、以下のような処理を実行します。<br>
	 * <ul>
	 * <li>引数に指定されたPromiseオブジェクトのうち、１つでもreject()が実行されると、failコールバックを実行します。</li>
	 * <li>引数に指定されたすべてのPromiseオブジェクトの全てでresolve()が実行されると、doneコールバックを実行します。</li>
	 * <li>引数に指定されたPromiseオブジェクトでnotify()が実行されると、progressコールバックを実行します。</li>
	 * </ul>
	 * 本メソッドはjQuery.when()と同様の機能を持っており、同じように使うことができます。<br>
	 * ただし、以下のような違いがあります。
	 * <h4>jQuery.when()と相違点</h4>
	 * <ul>
	 * <li>failコールバックが未指定の場合、共通のエラー処理(<a
	 * href="./h5.settings.html#commonFailHandler">commonFailHandler</a>)を実行します。</li>
	 * <li>jQuery1.6.xを使用している場合、jQuery.when()では使用できないnotify/progressの機能を使用することができます。ただし、この機能を使用するには<a
	 * href="h5.async.html#deferred">h5.async.deferred()</a>によって生成されたDeferredのPromiseオブジェクトを引数に指定する必要があります。<br>
	 * </li>
	 * <li>引数の指定方法について、jQuery.when()は可変長のみなのに対し、本メソッドは可変長またはPromiseオブジェクトを持つ配列で指定することができます。</li>
	 * </ul>
	 * <h4>引数の指定方法</h4>
	 * 配列または可変長で、複数のPromiseオブジェクトを渡すことができます。<br>
	 * 例)
	 * <ul>
	 * <li>h5.async.when(p1, p2, p3); </li>
	 * <li>h5.async.when([p1, p2, p3]); </li>
	 * </ul>
	 * Promiseオブジェクト以外を渡した時は無視されます。<br>
	 * また、可変長と配列の組み合わせで指定することはできません。<br>
	 * <ul>
	 * <li>h5.async.when(p1, [p2, p3], p4);</li>
	 * </ul>
	 * のようなコードを書いた時、2番目の引数は「配列」であり「Promise」ではないので無視され、p1とp4のみ待ちます。<br>
	 * <br>
	 * また、配列が入れ子になっていても、再帰的に評価はしません。<br>
	 * <ul>
	 * <li>h5.async.when([pi, [p2, p3], p4])</li>
	 * </ul>
	 * と書いても、先の例と同様p1とp4のみ待ちます。
	 *
	 * @param {Promise} var_args Promiseオブジェクﾄ(可変長または配列で複数のPromiseを指定する)
	 * @returns {Promise} Promiseオブジェクト
	 * @name when
	 * @function
	 * @memberOf h5.async
	 */
	var when = function(/* var_args */) {
		var argsToArray = h5.u.obj.argsToArray;
		var getDeferred = h5.async.deferred;

		var args = argsToArray(arguments);

		if (args.length === 1 && $.isArray(args[0])) {
			args = args[0];
		}

		/* del begin */
		// 引数にpromise・deferredオブジェクト以外があった場合はログを出力します。
		for ( var i = 0, l = args.length; i < l; i++) {
			// DeferredもPromiseも、promiseメソッドを持つので、
			// promiseメソッドがあるかどうかでDeferred/Promiseの両方を判定しています。
			if (args[i] != null && !args[i].promise && !$.isFunction(args[i].promise)) {
				fwLogger.info(FW_LOG_H5_WHEN_INVALID_PARAMETER);
				break;
			}
		}
		/* del end */

		var dfd = $.Deferred();

		// jQueryのバージョンが1.6.xの場合、progress/notifyが使用できるよう機能を追加する
		if (!dfd.notify && !dfd.notifyWith && !dfd.progress) {
			var len = args.length;
			var count = len;
			var pValues = new Array(len);
			var firstParam = args[0];

			dfd = len <= 1 && firstParam && $.isFunction(firstParam.promise) ? firstParam
					: getDeferred();

			// 複数のパラメータを配列でまとめて指定できるため、コールバックの実行をresolveWith/rejectWith/notifyWithで行っている

			function resolveFunc(index) {
				return function(value) {
					args[index] = arguments.length > 1 ? argsToArray(arguments) : value;
					if (!(--count)) {
						dfd.resolveWith(dfd, args);
					}
				};
			}

			function progressFunc(index) {
				return function(value) {
					pValues[index] = arguments.length > 1 ? argsToArray(arguments) : value;
					dfd.notifyWith(dfd.promise(), pValues);
				};
			}

			if (len > 1) {
				for ( var i = 0; i < len; i++) {
					if (args[i] && args[i].promise && $.isFunction(args[i].promise)) {
						args[i].promise().then(resolveFunc(i), dfd.reject, progressFunc(i));
					} else {
						--count;
					}
				}
				if (!count) {
					dfd.resolveWith(dfd, args);
				}
			} else if (dfd !== firstParam) {
				dfd.resolveWith(dfd, len ? [firstParam] : []);
			}
		} else {
			dfd = getDeferred();

			$.when.apply($, args).done(function(/* var_args */) {
				dfd.resolveWith(dfd, argsToArray(arguments));
			}).fail(function(/* var_args */) {
				dfd.rejectWith(dfd, argsToArray(arguments));
			}).progress(function(/* ver_args */) {
				dfd.notifyWith(dfd, argsToArray(arguments));
			});
		}

		return dfd.promise();
	};

	// =============================
	// Expose to window
	// =============================

	/**
	 * @namespace
	 * @name async
	 * @memberOf h5
	 */
	h5.u.obj.expose('h5.async', {
		deferred: deferred,
		when: when,
		isPromise: isPromise,
		loop: loop
	});

})();


/* ------ h5.ajax ------ */
(function() {
	// =========================================================================
	//
	// Constants
	//
	// =========================================================================

	// =============================
	// Production
	// =============================

	// =============================
	// Development Only
	// =============================

	/* del begin */

	/* del end */


	// =========================================================================
	//
	// Cache
	//
	// =========================================================================
	// =========================================================================
	//
	// Privates
	//
	// =========================================================================
	// =============================
	// Variables
	// =============================
	// =============================
	// Functions
	// =============================
	// =========================================================================
	//
	// Body
	//
	// =========================================================================
	/**
	 * HTTP通信を行います。<br />
	 * 基本的に使い方は、<a href="http://api.jquery.com/jQuery.ajax/">jQuery.ajax()</a>と同じです。<br />
	 * jQuery.ajax()と異なる点は共通のエラーハンドラが定義できることです。<br/>
	 * h5.settings.commonFailHandlerに関数を設定し、h5.ajax()に引数として渡すオプションにerror/completeコールバックが設定されていない、<br />
	 * もしくは戻り値のPromiseオブジェクトに対するfail/alwaysコールバックが設定されていない場合にエラーが発生すると <br />
	 * h5.settings.commonFailHandlerに設定した関数が呼ばれます。
	 *
	 * @param {Any} var_args jQuery.ajaxに渡す引数
	 * @returns {Promise} Promiseオブジェクト
	 * @name ajax
	 * @function
	 * @memberOf h5
	 */
	var ajax = function(var_args) {
		var opt = isString(arguments[0]) ? arguments[1] : arguments[0];
		var hasFailCallback = opt && (opt.error || opt.fail || opt.complete || opt.always);
		var jqXHR = $.ajax.apply($, arguments);

		if (!jqXHR.progress) {
			jqXHR.progress = function() {
			// notifyされることはないので空にしている
			};
		}

		var callFail = false;
		var commonFailHandler = h5.settings.commonFailHandler;
		if (!hasFailCallback && commonFailHandler) {
			jqXHR.fail(function(/* var_args */) {
				if (!callFail) {
					commonFailHandler.apply(null, arguments);
				}
			});
			var originalFail = jqXHR.fail;
			jqXHR.fail = function(/* var_args */) {
				callFail = true;
				return originalFail.apply(jqXHR, arguments);
			};
			jqXHR.error = jqXHR.fail;

			var originalAlways = jqXHR.always;
			jqXHR.always = function(/* var_args */) {
				callFail = true;
				return originalAlways.apply(jqXHR, arguments);
			};
			jqXHR.complete = jqXHR.always;

			jqXHR.then = function(doneCallbacks, failCallbacks, progressCallbacks) {
				if (doneCallbacks) {
					jqXHR.done.apply(jqXHR, wrapInArray(doneCallbacks));
				}
				if (failCallbacks) {
					jqXHR.fail.apply(jqXHR, wrapInArray(failCallbacks));
				}
				if (progressCallbacks) {
					jqXHR.progress.apply(jqXHR, wrapInArray(progressCallbacks));
				}
				return jqXHR;
			};
		}
		return jqXHR;
	};


	// =============================
	// Expose to window
	// =============================

	h5.u.obj.expose('h5', {
		ajax: ajax
	});
})();


/* ------ h5.core.controller ------ */
(function() {
	// =========================================================================
	//
	// Constants
	//
	// =========================================================================

	// =============================
	// Production
	// =============================

	var TEMPLATE_LOAD_RETRY_COUNT = 3;
	var TEMPLATE_LOAD_RETRY_INTERVAL = 3000;
	var TYPE_OF_UNDEFINED = 'undefined';
	var SUFFIX_CONTROLLER = 'Controller';
	var SUFFIX_LOGIC = 'Logic';
	var EVENT_NAME_H5_TRACKSTART = 'h5trackstart';
	var EVENT_NAME_H5_TRACKMOVE = 'h5trackmove';
	var EVENT_NAME_H5_TRACKEND = 'h5trackend';
	var ROOT_ELEMENT_NAME = 'rootElement';

	var EVENT_NAME_TRIGGER_INDICATOR = 'triggerIndicator';

	/** インラインコメントテンプレートのコメントノードの開始文字列 */
	var COMMENT_BINDING_TARGET_MARKER = '{h5view ';

	// エラーコード
	/** エラーコード: テンプレートに渡すセレクタが不正 */
	var ERR_CODE_INVALID_TEMPLATE_SELECTOR = 6000;
	/** エラーコード: バインド対象が指定されていない */
	var ERR_CODE_BIND_TARGET_REQUIRED = 6001;
	/** エラーコード: bindControllerメソッドにコントローラではないオブジェクトが渡された（このエラーはver.1.1.3時点では通常発生しないので削除） */
	//var ERR_CODE_BIND_NOT_CONTROLLER = 6002;
	/** エラーコード: バインド対象となるDOMがない */
	var ERR_CODE_BIND_NO_TARGET = 6003;
	/** エラーコード: バインド対象となるDOMが複数存在する */
	var ERR_CODE_BIND_TOO_MANY_TARGET = 6004;
	/** エラーコード: 指定された引数の数が少ない */
	var ERR_CODE_TOO_FEW_ARGUMENTS = 6005;
	/** エラーコード: コントローラの名前が指定されていない */
	var ERR_CODE_INVALID_CONTROLLER_NAME = 6006;
	/** エラーコード: コントローラの初期化パラメータが不正 */
	var ERR_CODE_CONTROLLER_INVALID_INIT_PARAM = 6007;
	/** エラーコード: 既にコントローラ化されている */
	var ERR_CODE_CONTROLLER_ALREADY_CREATED = 6008;
	/** エラーコード: コントローラの参照が循環している */
	var ERR_CODE_CONTROLLER_CIRCULAR_REF = 6009;
	/** エラーコード: コントローラ内のロジックの参照が循環している */
	var ERR_CODE_LOGIC_CIRCULAR_REF = 6010;
	/** エラーコード: コントローラの参照が循環している */
	var ERR_CODE_CONTROLLER_SAME_PROPERTY = 6011;
	/** エラーコード: イベントハンドラのセレクタに{this}が指定されている */
	var ERR_CODE_EVENT_HANDLER_SELECTOR_THIS = 6012;
	/** エラーコード: あるセレクタに対して重複したイベントハンドラが設定されている */
	var ERR_CODE_SAME_EVENT_HANDLER = 6013;
	/** エラーコード: __metaで指定されたプロパティがない */
	var ERR_CODE_CONTROLLER_META_KEY_INVALID = 6014;
	/** エラーコード: __metaで指定されたプロパティがnullである */
	var ERR_CODE_CONTROLLER_META_KEY_NULL = 6015;
	/** エラーコード: __metaで指定されたプロパティがコントローラではない */
	var ERR_CODE_CONTROLLER_META_KEY_NOT_CONTROLLER = 6016;
	/** エラーコード: ロジックの名前に文字列が指定されていない */
	var ERR_CODE_INVALID_LOGIC_NAME = 6017;
	/** エラーコード: 既にロジック化されている */
	var ERR_CODE_LOGIC_ALREADY_CREATED = 6018;
	/** エラーコード: exposeする際にコントローラ、もしくはロジックの名前がない */
	var ERR_CODE_EXPOSE_NAME_REQUIRED = 6019;
	/** エラーコード: Viewモジュールが組み込まれていない */
	var ERR_CODE_NOT_VIEW = 6029;
	/** エラーコード：バインド対象を指定する引数に文字列、オブジェクト、配列以外が渡された */
	var ERR_CODE_BIND_TARGET_ILLEGAL = 6030;
	/** エラーコード：ルートコントローラ以外ではcontroller.bind()はできない */
	var ERR_CODE_BIND_ROOT_ONLY = 6031;
	/** エラーコード：コントローラメソッドは最低2つの引数が必要 */
	var ERR_CODE_CONTROLLER_TOO_FEW_ARGS = 6032;

	// =============================
	// Development Only
	// =============================

	var fwLogger = h5.log.createLogger('h5.core');
	/* del begin */

	// ログメッセージ
	var FW_LOG_TEMPLATE_LOADED = 'コントローラ"{0}"のテンプレートの読み込みに成功しました。';
	var FW_LOG_TEMPLATE_LOAD_FAILED = 'コントローラ"{0}"のテンプレートの読み込みに失敗しました。URL：{1}';
	var FW_LOG_INIT_CONTROLLER_REJECTED = 'コントローラ"{0}"の{1}で返されたPromiseがfailしたため、コントローラの初期化を中断しdisposeしました。';
	var FW_LOG_INIT_CONTROLLER_ERROR = 'コントローラ"{0}"の初期化中にエラーが発生しました。{0}はdisposeされました。';
	var FW_LOG_INIT_CONTROLLER_BEGIN = 'コントローラ"{0}"の初期化を開始しました。';
	var FW_LOG_INIT_CONTROLLER_COMPLETE = 'コントローラ"{0}"の初期化が正常に完了しました。';
	var FW_LOG_INIT_CONTROLLER_THROWN_ERROR = 'コントローラ"{0}"の{1}内でエラーが発生したため、コントローラの初期化を中断しdisposeしました。';

	// エラーコードマップ
	var errMsgMap = {};
	errMsgMap[ERR_CODE_INVALID_TEMPLATE_SELECTOR] = 'update/append/prepend() の第1引数に"window", "navigator", または"window.", "navigator."で始まるセレクタは指定できません。';
	errMsgMap[ERR_CODE_BIND_TARGET_REQUIRED] = 'コントローラ"{0}"のバインド対象となる要素を指定して下さい。';
	//errMsgMap[ERR_CODE_BIND_NOT_CONTROLLER] = 'コントローラ化したオブジェクトを指定して下さい。';
	errMsgMap[ERR_CODE_BIND_NO_TARGET] = 'コントローラ"{0}"のバインド対象となる要素が存在しません。';
	errMsgMap[ERR_CODE_BIND_TOO_MANY_TARGET] = 'コントローラ"{0}"のバインド対象となる要素が2つ以上存在します。バインド対象は1つのみにしてください。';
	errMsgMap[ERR_CODE_TOO_FEW_ARGUMENTS] = '正しい数の引数を指定して下さい。';
	errMsgMap[ERR_CODE_INVALID_CONTROLLER_NAME] = 'コントローラの名前は必須です。コントローラの__nameにコントローラ名を空でない文字列で設定して下さい。';
	errMsgMap[ERR_CODE_CONTROLLER_INVALID_INIT_PARAM] = 'コントローラ"{0}"の初期化パラメータがプレーンオブジェクトではありません。初期化パラメータにはプレーンオブジェクトを設定してください。';
	errMsgMap[ERR_CODE_CONTROLLER_ALREADY_CREATED] = '指定されたオブジェクトは既にコントローラ化されています。';
	errMsgMap[ERR_CODE_CONTROLLER_CIRCULAR_REF] = 'コントローラ"{0}"で、参照が循環しているため、コントローラを生成できません。';
	errMsgMap[ERR_CODE_LOGIC_CIRCULAR_REF] = 'コントローラ"{0}"のロジックで、参照が循環しているため、ロジックを生成できません。';
	errMsgMap[ERR_CODE_CONTROLLER_SAME_PROPERTY] = 'コントローラ"{0}"のプロパティ"{1}"はコントローラ化によって追加されるプロパティと名前が重複しています。';
	errMsgMap[ERR_CODE_EVENT_HANDLER_SELECTOR_THIS] = 'コントローラ"{0}"でセレクタ名にthisが指定されています。コントローラをバインドした要素自身を指定したい時はrootElementを指定してください。';
	errMsgMap[ERR_CODE_SAME_EVENT_HANDLER] = 'コントローラ"{0}"のセレクタ"{1}"に対して"{2}"というイベントハンドラが重複して設定されています。';
	errMsgMap[ERR_CODE_CONTROLLER_META_KEY_INVALID] = 'コントローラ"{0}"には__metaで指定されたプロパティ"{1}"がありません。';
	errMsgMap[ERR_CODE_CONTROLLER_META_KEY_NULL] = 'コントローラ"{0}"の__metaに指定されたキー"{1}"の値がnullです。コントローラを持つプロパティキー名を指定してください。';
	errMsgMap[ERR_CODE_CONTROLLER_META_KEY_NOT_CONTROLLER] = 'コントローラ"{0}"の__metaに指定されたキー"{1}"の値はコントローラではありません。コントローラを持つプロパティキー名を指定してください。';
	errMsgMap[ERR_CODE_INVALID_LOGIC_NAME] = 'ロジック名は必須です。ロジックの__nameにロジック名を空でない文字列で設定して下さい。';
	errMsgMap[ERR_CODE_LOGIC_ALREADY_CREATED] = '指定されたオブジェクトは既にロジック化されています。';
	errMsgMap[ERR_CODE_EXPOSE_NAME_REQUIRED] = 'コントローラ、もしくはロジックの __name が設定されていません。';
	errMsgMap[ERR_CODE_NOT_VIEW] = 'テンプレートはViewモジュールがなければ使用できません。';
	errMsgMap[ERR_CODE_BIND_TARGET_ILLEGAL] = 'コントローラ"{0}"のバインド対象には、セレクタ文字列、または、オブジェクトを指定してください。';
	errMsgMap[ERR_CODE_BIND_ROOT_ONLY] = 'コントローラのbind(), unbind()はルートコントローラでのみ使用可能です。';
	errMsgMap[ERR_CODE_CONTROLLER_TOO_FEW_ARGS] = 'h5.core.controller()メソッドは、バインドターゲットとコントローラ定義オブジェクトの2つが必須です。';

	addFwErrorCodeMap(errMsgMap);
	/* del end */

	// =========================================================================
	//
	// Cache
	//
	// =========================================================================
	// TODO 高速化のために他で定義されている関数などを変数に入れておく場合はここに書く
	// =========================================================================
	//
	// Privates
	//
	// =========================================================================
	// =============================
	// Variables
	// =============================
	/**
	 * commonFailHandlerを発火させないために登録するdummyのfailハンドラ
	 */
	var dummyFailHandler = function() {
	//
	};
	var getDeferred = h5.async.deferred;
	var startsWith = h5.u.str.startsWith;
	var endsWith = h5.u.str.endsWith;
	var format = h5.u.str.format;
	var argsToArray = h5.u.obj.argsToArray;
	var getByPath = h5.u.obj.getByPath;
	/**
	 * セレクタのタイプを表す定数 イベントコンテキストの中に格納する
	 */
	var selectorTypeConst = {
		SELECTOR_TYPE_LOCAL: 1,
		SELECTOR_TYPE_GLOBAL: 2,
		SELECTOR_TYPE_OBJECT: 3
	};

	/**
	 * マウス/タッチイベントについてh5track*イベントをトリガしたかどうかを管理するため、イベントを格納する配列
	 */
	var storedEvents = [];

	/**
	 * あるマウス/タッチイベントについてh5track*イベントをトリガ済みかのフラグを保持する配列<br>
	 * storedEventsに格納されているイベントオブジェクトに対応して、<br>
	 * [true, false, false] のように格納されている。
	 */
	var h5trackTriggeredFlags = [];

	// =============================
	// Functions
	// =============================

	/**
	 * セレクタのタイプを表す定数 イベントコンテキストの中に格納する
	 */
	function EventContext(controller, event, evArg, selector, selectorType) {
		this.controller = controller;
		this.event = event;
		this.evArg = evArg;
		this.selector = selector;
		this.selectorType = selectorType;
	}
	// prototypeにセレクタのタイプを表す定数を追加
	$.extend(EventContext.prototype, selectorTypeConst);

	/**
	 * コントローラのexecuteListenersを見てリスナーを実行するかどうかを決定するインターセプタ。
	 *
	 * @param {Object} invocation インヴォケーション.
	 */
	function executeListenersInterceptor(invocation) {
		if (!this.__controllerContext.executeListeners) {
			return;
		}
		return invocation.proceed();
	}

	/**
	 * 指定されたオブジェクトの関数にアスペクトを織り込みます。
	 *
	 * @param {Object} controllerDefObject オブジェクト.
	 * @param {Object} prop プロパティ名.
	 * @param {Boolean} isEventHandler イベントハンドラかどうか.
	 * @returns {Object} AOPに必要なメソッドを織り込んだオブジェクト.
	 */
	function weaveControllerAspect(controllerDefObject, prop, isEventHandler) {
		var interceptors = getInterceptors(controllerDefObject.__name, prop);
		// イベントハンドラの場合、 enable/disableListeners()のために一番外側に制御用インターセプタを織り込む
		if (isEventHandler) {
			interceptors.push(executeListenersInterceptor);
		}
		return createWeavedFunction(controllerDefObject[prop], prop, interceptors);
	}

	/**
	 * 関数名とポイントカットを比べて、条件に合致すればインターセプタを返す.
	 *
	 * @param {String} targetName バインドする必要のある関数名.
	 * @param {Object} pcName ポイントカットで判別する対象名.
	 * @returns {Function[]} AOP用関数配列.
	 */
	function getInterceptors(targetName, pcName) {
		var ret = [];
		var aspects = h5.settings.aspects;
		// 織り込むべきアスペクトがない場合はそのまま空の配列を返す
		if (!aspects || aspects.length === 0) {
			return ret;
		}
		aspects = wrapInArray(aspects);
		for ( var i = aspects.length - 1; -1 < i; i--) {
			var aspect = aspects[i];
			if (aspect.target && !aspect.compiledTarget.test(targetName)) {
				continue;
			}
			var interceptors = aspect.interceptors;
			if (aspect.pointCut && !aspect.compiledPointCut.test(pcName)) {
				continue;
			}
			if (!$.isArray(interceptors)) {
				ret.push(interceptors);
				continue;
			}
			for ( var j = interceptors.length - 1; -1 < j; j--) {
				ret = ret.concat(interceptors[j]);
			}
		}
		return ret;
	}

	/**
	 * 基本となる関数にアスペクトを織り込んだ関数を返します。
	 *
	 * @param {Function} baseFunc 基本関数.
	 * @param {String} funcName 基本関数名.
	 * @param {Function[]} aspects AOP用関数配列.
	 * @returns {Function} AOP用関数を織り込んだ関数.
	 */
	function createWeavedFunction(base, funcName, aspects) {
		// 関数のウィービングを行う
		var weave = function(baseFunc, fName, aspect) {
			return function(/* var_args */) {
				var that = this;
				var invocation = {
					target: that,
					func: baseFunc,
					funcName: fName,
					args: arguments,
					proceed: function() {
						return baseFunc.apply(that, this.args);
					}
				};
				return aspect.call(that, invocation);
			};
		};

		var f = base;
		for ( var i = 0, l = aspects.length; i < l; i++) {
			f = weave(f, funcName, aspects[i]);
		}
		return f;
	}

	/**
	 * 指定されたオブジェクトの関数にアスペクトを織り込みます。
	 *
	 * @param {Object} logic ロジック.
	 * @returns {Object} AOPに必要なメソッドを織り込んだロジック.
	 */
	function weaveLogicAspect(logic) {
		for ( var prop in logic) {
			if ($.isFunction(logic[prop])) {
				logic[prop] = createWeavedFunction(logic[prop], prop, getInterceptors(logic.__name,
						prop));
			} else {
				logic[prop] = logic[prop];
			}
		}
		return logic;
	}

	/**
	 * コントローラ定義オブジェクトのプロパティがライフサイクルイベントどうかを返します。
	 *
	 * @param {Object} controllerDefObject コントローラ定義オブジェクト
	 * @param {String} prop プロパティ名
	 * @returns {Boolean} コントローラ定義オブジェクトのプロパティがライフサイクルイベントかどうか
	 */
	function isLifecycleProperty(controllerDefObject, prop) {
		// $.isFunction()による判定はいらないかも。
		return (prop === '__ready' || prop === '__construct' || prop === '__init')
				&& $.isFunction(controllerDefObject[prop]);
	}

	/**
	 * セレクタがコントローラの外側の要素を指しているかどうかを返します。<br>
	 * (外側の要素 = true)
	 *
	 * @param {String} selector セレクタ
	 * @returns {Boolean} コントローラの外側の要素を指しているかどうか
	 */
	function isGlobalSelector(selector) {
		return !!selector.match(/^\{.*\}$/);
	}

	/**
	 * イベント名がjQuery.bindを使って要素にイベントをバインドするかどうかを返します。
	 *
	 * @param {String} eventName イベント名
	 * @returns {Boolean} jQuery.bindを使って要素にイベントをバインドするかどうか
	 */
	function isBindRequested(eventName) {
		return !!eventName.match(/^\[.*\]$/);
	}

	/**
	 * セレクタから{}を外した文字列を返します。
	 *
	 * @param {String} selector セレクタ
	 * @returns {String} セレクタから{}を外した文字列
	 */
	function trimGlobalSelectorBracket(selector) {
		return $.trim(selector.substring(1, selector.length - 1));
	}

	/**
	 * イベント名から[]を外した文字列を返す
	 *
	 * @param {String} eventName イベント名
	 * @returns {String} イベント名から[]を外した文字列
	 */
	function trimBindEventBracket(eventName) {
		return $.trim(eventName.substring(1, eventName.length - 1));
	}

	/**
	 * 指定されたセレクタがwindow, window., document, document., navigator, navigator. で
	 * 始まっていればそのオブジェクトを、そうでなければそのまま文字列を返します。
	 *
	 * @param {String} selector セレクタ
	 * @returns {Object|String} パスで指定されたオブジェクト、もしくは未変換の文字列
	 */
	function getGlobalSelectorTarget(selector) {
		var specialObj = ['window', 'document', 'navigator'];
		for ( var i = 0, len = specialObj.length; i < len; i++) {
			var s = specialObj[i];
			if (selector === s) {
				//特殊オブジェクトそのものを指定された場合
				return getByPath(selector);
			}
			if (startsWith(selector, s + '.')) {
				//window. などドット区切りで続いている場合
				return getByPath(selector);
			}
		}
		return selector;
	}

	/**
	 * 指定されたプロパティがイベントハンドラかどうかを返します。
	 *
	 * @param {Object} controllerDefObject コントローラ定義オブジェクト
	 * @param {String} prop プロパティ名
	 * @returns {Boolean} プロパティがイベントハンドラかどうか
	 */
	function isEventHandler(controllerDefObject, prop) {
		return prop.indexOf(' ') !== -1 && $.isFunction(controllerDefObject[prop]);
	}

	/**
	 * コントローラ定義オブジェクトの子孫コントローラ定義が循環参照になっているかどうかをチェックします。
	 *
	 * @param {Object} controllerDefObject コントローラ定義オブジェクト
	 * @returns {Boolean} 循環参照になっているかどうか(true=循環参照)
	 */
	function checkControllerCircularRef(controllerDefObject) {
		var checkCircular = function(controllerDef, ancestors) {
			for ( var prop in controllerDef)
				if ($.inArray(controllerDef, ancestors) >= 0 || endsWith(prop, SUFFIX_CONTROLLER)
						&& checkCircular(controllerDef[prop], ancestors.concat([controllerDef]))) {
					return true;
				}
			return false;
		};
		return checkCircular(controllerDefObject, []);
	}

	/**
	 * コントローラ定義オブジェクトのロジック定義が循環参照になっているかどうかをチェックします。
	 *
	 * @param {Object} controllerDefObject コントローラ定義オブジェクト
	 * @returns {Boolean} 循環参照になっているかどうか(true=循環参照)
	 */
	function checkLogicCircularRef(controllerDefObj) {
		var checkCircular = function(controllerDef, ancestors) {
			for ( var prop in controllerDef)
				if ($.inArray(controllerDef, ancestors) >= 0 || endsWith(prop, SUFFIX_LOGIC)
						&& checkCircular(controllerDef[prop], ancestors.concat([controllerDef]))) {
					return true;
				}
			return false;
		};
		return checkCircular(controllerDefObj, []);
	}

	/**
	 * コントローラのプロパティが子コントローラかどうかを返します。
	 *
	 * @param {Object} controller コントローラ
	 * @param {String} プロパティ名
	 * @returns {Boolean} コントローラのプロパティが子コントローラかどうか(true=子コントローラである)
	 */
	function isChildController(controller, prop) {
		var target = controller[prop];
		return endsWith(prop, SUFFIX_CONTROLLER) && prop !== 'rootController'
				&& prop !== 'parentController' && !$.isFunction(target)
				&& (target && !target.__controllerContext.isRoot);
	}

	/**
	 * 指定されたコントローラの子孫コントローラのPromiseオブジェクトを全て取得します。
	 *
	 * @param {Object} controller コントローラ
	 * @param {String} propertyName プロパティ名(initPromise,readyPromise)
	 * @param {Object} aquireFromControllerContext コントローラコンテキストのプロパティかどうか
	 * @returns {Promise[]} Promiseオブジェクト配列
	 */
	function getDescendantControllerPromises(controller, propertyName, aquireFromControllerContext) {
		var promises = [];
		var targets = [];
		var getPromisesInner = function(object) {
			targets.push(object);
			for ( var prop in object) {
				if (isChildController(object, prop)) {
					var c = object[prop];
					var promise = aquireFromControllerContext ? c.__controllerContext[propertyName]
							: c[propertyName];
					if (promise) {
						promises.push(promise);
					}
					if ($.inArray(c, targets) === -1) {
						getPromisesInner(c);
					}
				}
			}
		};
		getPromisesInner(controller);
		return promises;
	}

	/**
	 * 子孫コントローラのイベントハンドラをバインドします。
	 *
	 * @param {Controller} controller コントローラ
	 */
	function bindDescendantHandlers(controller) {
		var execute = function(controllerInstance) {
			var meta = controllerInstance.__meta;
			var notBindControllers = {};
			if (meta) {
				for ( var prop in meta) {
					if (meta[prop].useHandlers === false) {
						// trueより文字数が少ないため1を代入。機能的には"true"を表せば何を代入しても良い。
						notBindControllers[prop] = 1;
					}
				}
			}

			for ( var prop in controllerInstance) {
				var c = controllerInstance[prop];
				if (!isChildController(controllerInstance, prop)) {
					continue;
				}
				execute(c);
				if (!notBindControllers[prop]) {
					bindByBindMap(c);
				}
			}
		};
		execute(controller);
	}

	/**
	 * バインドマップに基づいてイベントハンドラをバインドします。
	 *
	 * @param {Controller} controller コントローラ
	 */
	function bindByBindMap(controller) {
		var bindMap = controller.__controllerContext.bindMap;
		for ( var s in bindMap) {
			for ( var e in bindMap[s]) {
				(function(selector, eventName) {
					bindEventHandler(controller, selector, eventName);
				})(s, e);
			}
		}
	}

	/**
	 * イベントハンドラのバインドを行います。
	 *
	 * @param {Controller} controller コントローラ
	 * @param {String} selector セレクタ
	 * @param {String} eventName イベント名
	 */
	function bindEventHandler(controller, selector, eventName) {
		// bindMapに格納しておいたハンドラを取得
		var func = controller.__controllerContext.bindMap[selector][eventName];
		var event = eventName;
		var bindRequested = isBindRequested(eventName);
		if (bindRequested) {
			event = trimBindEventBracket(eventName);
		}
		var bindObj = null;
		switch (event) {
		case 'mousewheel':
			bindObj = getNormalizeMouseWheelBindObj(controller, selector, event, func);
			break;
		case EVENT_NAME_H5_TRACKSTART:
		case EVENT_NAME_H5_TRACKMOVE:
		case EVENT_NAME_H5_TRACKEND:
			bindObj = getH5TrackBindObj(controller, selector, eventName, func);
			break;
		default:
			bindObj = getNormalBindObj(controller, selector, event, func);
			break;
		}

		if (!$.isArray(bindObj)) {
			useBindObj(bindObj, bindRequested);
			return;
		}
		for ( var i = 0, l = bindObj.length; i < l; i++) {
			useBindObj(bindObj[i], bindRequested);
		}
	}

	/**
	 * バインドオブジェクトに基づいてイベントハンドラをバインドします。
	 *
	 * @param {Object} bindObj バインドオブジェクト
	 */
	function bindByBindObject(bindObj) {
		var controller = bindObj.controller;
		var rootElement = controller.rootElement;
		var selector = bindObj.selector;
		var eventName = bindObj.eventName;
		var handler = bindObj.handler;
		var useBind = isBindRequested(eventName);
		var event = useBind ? trimBindEventBracket(eventName) : eventName;

		if (isGlobalSelector(selector)) {
			// グローバルなセレクタの場合
			var selectorTrimmed = trimGlobalSelectorBracket(selector);
			var isSelf = false;
			var selectTarget;
			if (selectorTrimmed === ROOT_ELEMENT_NAME) {
				selectTarget = rootElement;
				isSelf = true;
			} else {
				selectTarget = getGlobalSelectorTarget(selectorTrimmed);
			}

			// バインド対象がオブジェクトの場合、必ず直接バインドする
			if (isSelf || useBind || !isString(selectTarget)) {
				// bindObjにselectorTypeを登録する
				bindObj.evSelectorType = selectorTypeConst.SELECTOR_TYPE_OBJECT;

				$(selectTarget).bind(event, handler);
			} else {
				// bindObjにselectorTypeを登録する
				bindObj.evSelectorType = selectorTypeConst.SELECTOR_TYPE_GLOBAL;

				$(document).delegate(selectTarget, event, handler);
			}
			// selectorがグローバル指定の場合はcontext.selectorに{}を取り除いた文字列を格納する
			// selectorがオブジェクト指定(rootElement, window, document)の場合はオブジェクトを格納する
			bindObj.evSelector = selectTarget;
		} else {
			// selectorがグローバル指定でない場合
			// bindObjにselectorTypeを登録し、selectorは文字列を格納する
			bindObj.evSelectorType = selectorTypeConst.SELECTOR_TYPE_LOCAL;
			bindObj.evSelector = selector;

			if (useBind) {
				$(selector, rootElement).bind(event, handler);
			} else {
				$(rootElement).delegate(selector, event, handler);
			}
		}
	}

	/**
	 * バインドオブジェクトに対して必要であればイベント名を修正し、アンバインドマップにハンドラを追加した後、 実際にバインドを行います。
	 *
	 * @param {Object} bindObj バインドオブジェクト
	 * @param {Boolean} bindRequested イベントハンドラをバインド([]記法)すべきかどうか
	 */
	function useBindObj(bindObj, bindRequested) {
		if (bindRequested) {
			bindObj.eventName = '[' + bindObj.eventName + ']';
		}
		// イベントコンテキストを作成してからハンドラを呼び出すようにhandlerをラップする
		// unbindMapにラップしたものが登録されるように、このタイミングで行う必要がある
		var handler = bindObj.handler;
		bindObj.handler = function(/* var args */) {
			handler.call(bindObj.controller, createEventContext(bindObj, arguments));
		};
		// アンバインドマップにハンドラを追加
		registerUnbindMap(bindObj.controller, bindObj.selector, bindObj.eventName, bindObj.handler);
		bindByBindObject(bindObj);
	}

	/**
	 * 子孫コントローラのイベントハンドラをアンバインドします。
	 *
	 * @param {Controller} controller コントローラ
	 */
	function unbindDescendantHandlers(controller) {
		var execute = function(controllerInstance) {
			var meta = controllerInstance.__meta;
			var notBindControllers = {};
			if (meta) {
				for ( var prop in meta) {
					if (meta[prop].useHandlers === false) {
						// trueより文字数が少ないため1を代入。機能的には"true"を表せば何を代入しても良い。
						notBindControllers[prop] = 1;
					}
				}
			}

			for ( var prop in controllerInstance) {
				var c = controllerInstance[prop];
				if (!isChildController(controllerInstance, prop)) {
					continue;
				}
				execute(c);
				if (!notBindControllers[prop]) {
					unbindByBindMap(c);
				}
			}
		};
		execute(controller);
	}

	/**
	 * バインドマップに基づいてイベントハンドラをアンバインドします。
	 *
	 * @param {Controller} controller コントローラ
	 */
	function unbindByBindMap(controller) {
		var rootElement = controller.rootElement;
		var unbindMap = controller.__controllerContext.unbindMap;
		for ( var selector in unbindMap) {
			for ( var eventName in unbindMap[selector]) {
				var handler = unbindMap[selector][eventName];
				var useBind = isBindRequested(eventName);
				var event = useBind ? trimBindEventBracket(eventName) : eventName;
				if (isGlobalSelector(selector)) {
					var selectTarget = trimGlobalSelectorBracket(selector);
					var isSelf = false;
					if (selectTarget === ROOT_ELEMENT_NAME) {
						selectTarget = rootElement;
						isSelf = true;
					} else {
						selectTarget = getGlobalSelectorTarget(selectTarget);
					}

					if (isSelf || useBind || !isString(selectTarget)) {
						$(selectTarget).unbind(event, handler);
					} else {
						$(document).undelegate(selectTarget, event, handler);
					}
				} else {
					if (useBind) {
						$(selector, rootElement).unbind(event, handler);
					} else {
						$(rootElement).undelegate(selector, event, handler);
					}
				}
			}
		}
	}

	/**
	 * 指定されたフラグで子コントローラを含む全てのコントローラのexecuteListenersフラグを変更します。
	 *
	 * @param {Controller} controller コントローラ
	 * @param {Boolean} flag フラグ
	 */
	function setExecuteListenersFlag(controller, flag) {
		controller.__controllerContext.executeListeners = flag;
		var targets = [];
		var changeFlag = function(controllerInstance) {
			targets.push(controllerInstance);
			for ( var prop in controllerInstance) {
				if (isChildController(controllerInstance, prop)) {
					var c = controllerInstance[prop];
					c.__controllerContext.executeListeners = flag;
					if ($.inArray(c, targets) === -1) {
						changeFlag(c);
					}
				}
			}
		};
		changeFlag(controller);
	}

	/**
	 * rootControllerとparentControllerをセットします。
	 *
	 * @param {Controller} controller コントローラ
	 */
	function initRootAndParentController(controller) {
		var targets = [];
		var init = function(controllerInstance, root, parent) {
			controllerInstance.rootController = root;
			controllerInstance.parentController = parent;
			targets.push(controllerInstance);
			for ( var prop in controllerInstance) {
				if (isChildController(controllerInstance, prop)) {
					var c = controllerInstance[prop];
					if ($.inArray(c, targets) === -1) {
						init(c, root, controllerInstance);
					}
				}
			}
		};
		init(controller, controller, null);
	}

	/**
	 * __init, __readyイベントを実行する.
	 *
	 * @param ｛Object} controller コントローラ.
	 * @param {Booelan} isInitEvent __initイベントを実行するかどうか.
	 */
	function executeLifecycleEventChain(controller, isInitEvent) {
		var funcName = isInitEvent ? '__init' : '__ready';

		var leafDfd = getDeferred();
		setTimeout(function() {
			leafDfd.resolve();
		}, 0);
		var leafPromise = leafDfd.promise();

		var execInner = function(controllerInstance) {
			var isLeafController = true;
			for ( var prop in controllerInstance) {
				// 子コントローラがあれば再帰的に処理
				if (isChildController(controllerInstance, prop)) {
					isLeafController = false;
					execInner(controllerInstance[prop]);
				}
			}

			// 子孫コントローラの準備ができた時に実行させる関数を定義
			var func = function() {
				var ret = null;
				var lifecycleFunc = controllerInstance[funcName];
				var controllerName = controllerInstance.__name;
				if (lifecycleFunc) {
					try {
						ret = controllerInstance[funcName]
								(createInitializationContext(controllerInstance));
					} catch (e) {
						// __init, __readyで例外が投げられた
						fwLogger.error(FW_LOG_INIT_CONTROLLER_THROWN_ERROR, controllerName,
								isInitEvent ? '__init' : '__ready');

						// 同じrootControllerを持つ他の子のdisposeによって、
						// controller.rootControllerがnullになっている場合があるのでそのチェックをしてからdisposeする
						controller.rootController && controller.rootController.dispose(arguments);

						// dispose処理が終わったら例外を投げる
						throw e;
					}
				}
				// ライフサイクルイベント実行後に呼ぶべきコールバック関数を作成
				var callback = isInitEvent ? createCallbackForInit(controllerInstance)
						: createCallbackForReady(controllerInstance);
				if (h5.async.isPromise(ret)) {
					// __init, __ready がpromiseを返している場合
					ret.done(function() {
						callback();
					}).fail(
							function(/* var_args */) {
								// rejectされた場合は連鎖的にdisposeする
								fwLogger.error(FW_LOG_INIT_CONTROLLER_REJECTED, controllerName,
										isInitEvent ? '__init' : '__ready');
								fwLogger.error(FW_LOG_INIT_CONTROLLER_ERROR,
										controller.rootController.__name);

								// 同じrootControllerを持つ他の子のdisposeによって、
								// controller.rootControllerがnullになっている場合があるのでそのチェックをしてからdisposeする
								controller.rootController
										&& controller.rootController.dispose(arguments);
							});
				} else {
					callback();
				}
			};
			// getPromisesForXXXの戻り値が空の配列の場合はfunc()は同期的に呼ばれる
			var promises = isInitEvent ? getPromisesForInit(controllerInstance)
					: getPromisesForReady(controllerInstance);
			if (isInitEvent && isLeafController) {
				promises.push(leafPromise);
			}
			// dfdがrejectされたとき、commonFailHandlerが発火しないようにするため、dummyのfailハンドラを登録する
			h5.async.when(promises).done(function() {
				func();
			}).fail(dummyFailHandler);
		};
		execInner(controller);
	}

	/**
	 * __initイベントを実行するために必要なPromiseを返します。
	 *
	 * @param {Controller} controller コントローラ
	 * @returns {Promise[]} Promiseオブジェクト
	 */
	function getPromisesForInit(controller) {
		// 子孫コントローラのinitPromiseオブジェクトを取得
		var initPromises = getDescendantControllerPromises(controller, 'initPromise');
		// 自身のテンプレート用Promiseオブジェクトを取得
		initPromises.push(controller.preinitPromise);
		return initPromises;
	}

	/**
	 * __readyイベントを実行するために必要なPromiseを返します。
	 *
	 * @param {Controller} controller コントローラ
	 * @returns {Promise[]} Promiseオブジェクト
	 */
	function getPromisesForReady(controller) {
		// 子孫コントローラのreadyPromiseオブジェクトを取得
		return getDescendantControllerPromises(controller, 'readyPromise');
	}

	/**
	 * __initイベントで実行するコールバック関数を返します。
	 *
	 * @param {Controller} controller コントローラ
	 */
	function createCallbackForInit(controller) {
		return function() {
			// disopseされていたら何もしない。
			if (isDisposing(controller)) {
				return;
			}
			controller.isInit = true;
			var initDfd = controller.__controllerContext.initDfd;
			// FW、ユーザともに使用しないので削除
			delete controller.__controllerContext.templatePromise;
			delete controller.__controllerContext.preinitDfd;
			delete controller.__controllerContext.initDfd;
			initDfd.resolve();

			if (controller.__controllerContext && controller.__controllerContext.isRoot) {
				// ルートコントローラであれば次の処理(イベントハンドラのバインドと__readyの実行)へ進む
				bindAndTriggerReady(controller);
			}
		};
	}

	/**
	 * __readyイベントで実行するコールバック関数を返します。
	 *
	 * @param {Controller} controller コントローラ
	 */
	function createCallbackForReady(controller) {
		return function() {
			// disopseされていたら何もしない。
			if (isDisposing(controller)) {
				return;
			}
			controller.isReady = true;

			var readyDfd = controller.__controllerContext.readyDfd;
			// FW、ユーザともに使用しないので削除
			delete controller.__controllerContext.readyDfd;
			readyDfd.resolve();

			if (controller.__controllerContext && controller.__controllerContext.isRoot) {
				// ルートコントローラであれば全ての処理が終了したことを表すイベント"h5controllerready"をトリガ
				if (!controller.rootElement || !controller.isInit || !controller.isReady) {
					return;
				}
				$(controller.rootElement).trigger('h5controllerready', controller);
			}
		};
	}

	/**
	 * テンプレートに渡すセレクタとして正しいかどうかを返します。
	 *
	 * @param {String} selector セレクタ
	 * @returns {Boolean} テンプレートに渡すセレクタとして正しいかどうか(true=正しい)
	 */
	function isCorrectTemplatePrefix(selector) {
		if (startsWith(selector, 'window')) {
			return false;
		}
		if (startsWith(selector, 'navigator')) {
			return false;
		}
		return true;
	}

	/**
	 * 指定された要素が文字列があれば、ルートエレメント、{}記法を考慮した要素をjQueryオブジェクト化して返します。 DOM要素、jQueryオブジェクトであれば、
	 * jQueryオブジェクト化して(指定要素がjQueryオブジェクトの場合、無駄な処理になるがコスト的には問題ない)返します。
	 *
	 * @param {String|DOM|jQuery} セレクタ、DOM要素、jQueryオブジェクト
	 * @param {DOM} rootElement ルートエレメント
	 * @param {Boolean} isTemplate テンプレートで使用するかどうか
	 * @returns {jQuery} jQueryオブジェクト
	 */
	function getTarget(element, rootElement, isTemplate) {
		if (!isString(element)) {
			return $(element);
		}
		var $targets;
		var selector = $.trim(element);
		if (isGlobalSelector(selector)) {
			var s = trimGlobalSelectorBracket(selector);
			if (isTemplate && !isCorrectTemplatePrefix(s)) {
				throwFwError(ERR_CODE_INVALID_TEMPLATE_SELECTOR);
			}
			$targets = $(getGlobalSelectorTarget(s));
		} else {
			$targets = $(rootElement).find(element);
		}
		return $targets;
	}

	/**
	 * ハンドラをアンバインドマップに登録します。
	 *
	 * @param {Controller} controller コントローラ
	 * @param {String} selector セレクタ
	 * @param {String} eventName イベント名
	 * @param {Function} handler ハンドラ
	 */
	function registerUnbindMap(controller, selector, eventName, handler) {
		if (!controller.__controllerContext.unbindMap[selector]) {
			controller.__controllerContext.unbindMap[selector] = {};
		}
		controller.__controllerContext.unbindMap[selector][eventName] = handler;
	}

	/**
	 * バインドオブジェクトを返します。
	 *
	 * @param {Controller} controller コントローラ
	 * @param {String} selector セレクタ
	 * @param {String} eventName イベント名
	 * @param {Function} func ハンドラとして登録したい関数
	 * @returns {Object} バインドオブジェクト
	 *          <ul>
	 *          <li>bindObj.controller - コントローラ</li>
	 *          <li>bindObj.selector - セレクタ</li>
	 *          <li>bindObj.eventName - イベント名</li>
	 *          <li>bindObj.handler - イベントハンドラ</li>
	 *          </ul>
	 */
	function getNormalBindObj(controller, selector, eventName, func) {
		return {
			controller: controller,
			selector: selector,
			eventName: eventName,
			handler: func
		};
	}

	/**
	 * クラスブラウザな"mousewheel"イベントのためのバインドオブジェクトを返します。
	 *
	 * @param {Controller} controller コントローラ
	 * @param {String} selector セレクタ
	 * @param {String} eventName イベント名
	 * @param {Function} func ハンドラとして登録したい関数
	 * @returns {Object} バインドオブジェクト
	 *          <ul>
	 *          <li>bindObj.controller - コントローラ</li>
	 *          <li>bindObj.selector - セレクタ</li>
	 *          <li>bindObj.eventName - イベント名</li>
	 *          <li>bindObj.handler - イベントハンドラ</li>
	 *          </ul>
	 */
	function getNormalizeMouseWheelBindObj(controller, selector, eventName, func) {
		return {
			controller: controller,
			selector: selector,
			// Firefoxには"mousewheel"イベントがない
			eventName: typeof document.onmousewheel === TYPE_OF_UNDEFINED ? 'DOMMouseScroll'
					: eventName,
			handler: function(context) {
				var event = context.event;
				// Firefox
				if (event.originalEvent && event.originalEvent.detail) {
					event.wheelDelta = -event.detail * 40;
				}
				func.call(controller, context);
			}
		};
	}

	/**
	 * hifiveの独自イベント"h5trackstart", "h5trackmove", "h5trackend"のためのバインドオブジェクトを返します。
	 *
	 * @param {Controller} controller コントローラ
	 * @param {String} selector セレクタ
	 * @param {String} eventName イベント名
	 * @param {Function} func ハンドラとして登録したい関数
	 * @returns {Object[]} バインドオブジェクト
	 *          <ul>
	 *          <li>bindObj.controller - コントローラ</li>
	 *          <li>bindObj.selector - セレクタ</li>
	 *          <li>bindObj.eventName - イベント名</li>
	 *          <li>bindObj.handler - イベントハンドラ</li>
	 *          </ul>
	 */
	function getH5TrackBindObj(controller, selector, eventName, func) {
		// タッチイベントがあるかどうか
		var hasTouchEvent = typeof document.ontouchstart !== TYPE_OF_UNDEFINED;
		if (eventName !== EVENT_NAME_H5_TRACKSTART) {
			if (hasTouchEvent) {
				return getNormalBindObj(controller, selector, eventName, func);
			}
			// イベントオブジェクトの正規化
			return getNormalBindObj(controller, selector, eventName, function(context) {
				var event = context.event;
				var offset = $(event.currentTarget).offset() || {
					left: 0,
					top: 0
				};
				event.offsetX = event.pageX - offset.left;
				event.offsetY = event.pageY - offset.top;
				func.apply(this, arguments);
			});
		}
		var getEventType = function(en) {
			switch (en) {
			case 'touchstart':
			case 'mousedown':
				return EVENT_NAME_H5_TRACKSTART;
			case 'touchmove':
			case 'mousemove':
				return EVENT_NAME_H5_TRACKMOVE;
			case 'touchend':
			case 'mouseup':
				return EVENT_NAME_H5_TRACKEND;
			}
		};

		// jQuery.Eventオブジェクトのプロパティをコピーする。
		// 1.6.xの場合, "liveFired"というプロパティがあるがこれをコピーしてしまうとtriggerしてもイベントが発火しない。
		var copyEventObject = function(src, dest) {
			for ( var prop in src) {
				if (src.hasOwnProperty(prop) && !dest[prop] && prop !== 'target'
						&& prop !== 'currentTarget' && prop !== 'originalEvent'
						&& prop !== 'liveFired') {
					dest[prop] = src[prop];
				}
			}
			dest.h5DelegatingEvent = src;
		};

		var start = hasTouchEvent ? 'touchstart' : 'mousedown';
		var move = hasTouchEvent ? 'touchmove' : 'mousemove';
		var end = hasTouchEvent ? 'touchend' : 'mouseup';
		var $document = $(document);
		var getBindObjects = function() {
			// h5trackendイベントの最後でハンドラの除去を行う関数を格納するための変数
			var removeHandlers = null;
			var execute = false;
			var getHandler = function(en, eventTarget, setup) {
				return function(context) {
					var type = getEventType(en);
					var isStart = type === EVENT_NAME_H5_TRACKSTART;
					if (isStart && execute) {
						// スタートイベントが起きた時に実行中 = マルチタッチされた時なので、何もしない
						return;
					}
					if (hasTouchEvent) {
						// タッチイベントの場合、イベントオブジェクトに座標系のプロパティを付加
						initTouchEventObject(context.event, en);
					}
					var newEvent = new $.Event(type);
					copyEventObject(context.event, newEvent);
					var target = context.event.target;
					if (eventTarget) {
						target = eventTarget;
					}
					if (setup) {
						setup(newEvent);
					}

					// ------------- h5track*のトリガ処理 -------------
					// originalEventがあればoriginalEvent、なければjQueryEventオブジェクトでh5track*をトリガしたかどうかのフラグを管理する
					var triggeredFlagEvent = context.event.originalEvent || context.event;

					if (isStart && $.inArray(triggeredFlagEvent, storedEvents) === -1) {
						// スタート時で、かつこのスタートイベントがstoredEventsに入っていないなら
						// トリガする前にトリガフラグ保管イベントのリセット(storedEventsに不要なイベントオブジェクトを残さないため)
						storedEvents = [];
						h5trackTriggeredFlags = [];
					}

					var index = $.inArray(triggeredFlagEvent, storedEvents);
					if (index === -1) {
						// storedEventsにイベントが登録されていなければ追加し、トリガ済みフラグにfalseをセットする
						index = storedEvents.push(triggeredFlagEvent) - 1;
						h5trackTriggeredFlags[index] = false;
					}
					// sotredEventsにイベントが登録されていれば、そのindexからトリガ済みフラグを取得する
					var triggeredFlag = h5trackTriggeredFlags[index];

					if (!triggeredFlag && (!hasTouchEvent || execute || isStart)) {
						// マウス/タッチイベントがh5track*にトリガ済みではない時にトリガする。
						// h5track中でないのにmoveやmouseupが起きた時は何もしない。

						// トリガ済みフラグを立てる
						h5trackTriggeredFlags[index] = true;
						// h5track*イベントをトリガ
						$(target).trigger(newEvent, context.evArg);
						execute = true;
					}

					// 不要なイベントオブジェクトを残さないため、
					// documentだったら現在のイベントとそのフラグをstoredEvents/h5trackTriggeredFlagsから外す
					// h5trackend時ならstoredEvents/h5trackTtriggeredFlagsをリセットする
					// (※ documentまでバブリングすればイベントオブジェクトを保管しておく必要がなくなるため)
					if (context.event.currentTarget === document) {
						if (type === EVENT_NAME_H5_TRACKEND) {
							storedEvents = [];
							h5trackTriggeredFlags = [];
						}
						var storedIndex = $.inArray(triggeredFlagEvent, storedEvents);
						if (storedIndex !== -1) {
							storedEvents.splice(index, 1);
							h5trackTriggeredFlags.splice(index, 1);
						}
					}
					// ------------- h5track*のトリガ処理 ここまで -------------

					if (isStart && execute) {
						// スタートイベント、かつ今h5trackstartをトリガしたところなら、
						// h5trackmove,endを登録

						newEvent.h5DelegatingEvent.preventDefault();
						var nt = newEvent.target;

						// 直前のh5track系イベントとの位置の差分を格納
						var ox = newEvent.clientX;
						var oy = newEvent.clientY;
						var setupDPos = function(ev) {
							var cx = ev.clientX;
							var cy = ev.clientY;
							ev.dx = cx - ox;
							ev.dy = cy - oy;
							ox = cx;
							oy = cy;
						};

						// h5trackstart実行時に、move、upのハンドラを作成して登録する。
						// コンテキストをとるように関数をラップして、bindする。
						var moveHandler = getHandler(move, nt, setupDPos);
						var upHandler = getHandler(end, nt);
						var moveHandlerWrapped = function(e) {
							context.event = e;
							context.evArg = handlerArgumentsToContextEvArg(arguments);
							moveHandler(context);
						};
						var upHandlerWrapped = function(e) {
							context.event = e;
							context.evArg = handlerArgumentsToContextEvArg(arguments);
							upHandler(context);
						};

						var $bindTarget = hasTouchEvent ? $(nt) : $document;
						// moveとendのunbindをする関数
						removeHandlers = function() {
							storedEvents = [];
							h5trackTriggeredFlags = [];
							$bindTarget.unbind(move, moveHandlerWrapped);
							$bindTarget.unbind(end, upHandlerWrapped);
							if (!hasTouchEvent && controller.rootElement !== document) {
								$(controller.rootElement).unbind(move, moveHandlerWrapped);
								$(controller.rootElement).unbind(end, upHandlerWrapped);
							}
						};
						// h5trackmoveとh5trackendのbindを行う
						$bindTarget.bind(move, moveHandlerWrapped);
						$bindTarget.bind(end, upHandlerWrapped);

						// タッチでなく、かつコントローラのルートエレメントがdocumentでなかったら、ルートエレメントにもバインドする
						// タッチイベントのない場合、move,endをdocumentにバインドしているが、途中でmousemove,mouseupを
						// stopPropagationされたときに、h5trackイベントを発火することができなくなる。
						// コントローラのルートエレメント外でstopPropagationされていた場合を考慮して、
						// ルートエレメントにもmove,endをバインドする。
						// (ルートエレメントの内側でstopPropagationしている場合は考慮しない)
						// (タッチの場合はターゲットはstart時の要素なので2重にバインドする必要はない)
						if (!hasTouchEvent && controller.rootElement !== document) {
							// h5trackmoveとh5trackendのbindを行う
							$(controller.rootElement).bind(move, moveHandlerWrapped);
							$(controller.rootElement).bind(end, upHandlerWrapped);
						}
					} else if (type === EVENT_NAME_H5_TRACKEND) {
						// touchend,mousup時(=h5trackend時)にmoveとendのイベントをunbindする
						removeHandlers();
						execute = false;
					}
				};
			};
			var createBindObj = function(en) {
				return {
					controller: controller,
					selector: selector,
					eventName: en,
					handler: getHandler(en)
				};
			};
			var bindObjects = [getNormalBindObj(controller, selector, eventName, func)];
			bindObjects.push(createBindObj(start));
			return bindObjects;
		};
		return getBindObjects();
	}

	/**
	 * タッチイベントのイベントオブジェクトにpageXやoffsetXといった座標系のプロパティを追加します。
	 * <p>
	 * touchstart/touchmove/touchendをjQuery.trigger()で発火させた場合、originalEventプロパティは存在しないので、座標系プロパティのコピーを行いません。
	 *
	 * @param {Object} event jQuery.Eventオブジェクト
	 * @param {String} eventName イベント名
	 */
	function initTouchEventObject(event, eventName) {
		var originalEvent = event.originalEvent;

		if (!originalEvent) {
			return;
		}

		var touches = eventName === 'touchend' || eventName === 'touchcancel' ? originalEvent.changedTouches[0]
				: originalEvent.touches[0];
		var pageX = touches.pageX;
		var pageY = touches.pageY;
		event.pageX = originalEvent.pageX = pageX;
		event.pageY = originalEvent.pageY = pageY;
		event.screenX = originalEvent.screenX = touches.screenX;
		event.screenY = originalEvent.screenY = touches.screenY;
		event.clientX = originalEvent.clientX = touches.clientX;
		event.clientY = originalEvent.clientY = touches.clientY;

		var target = event.target;
		if (target.ownerSVGElement) {
			target = target.farthestViewportElement;
		} else if (target === window || target === document) {
			target = document.body;
		}
		var offset = $(target).offset();
		if (offset) {
			var offsetX = pageX - offset.left;
			var offsetY = pageY - offset.top;
			event.offsetX = originalEvent.offsetX = offsetX;
			event.offsetY = originalEvent.offsetY = offsetY;
		}
	}
	/**
	 * イベントオブジェクトを正規化します。
	 *
	 * @param {Object} event jQuery.Eventオブジェクト
	 */
	function normalizeEventObjext(event) {
		// ここはnull, undefinedの場合にtrueとしたいため、あえて厳密等価を使用していない
		if (event && event.offsetX == null && event.offsetY == null && event.pageX && event.pageY) {
			var target = event.target;
			if (target.ownerSVGElement) {
				target = target.farthestViewportElement;
			} else if (target === window || target === document) {
				target = document.body;
			}
			var offset = $(target).offset();
			if (offset) {
				event.offsetX = event.pageX - offset.left;
				event.offsetY = event.pageY - offset.top;
			}
		}
	}

	/**
	 * イベントハンドラに渡された、イベントオブジェクト以降の引数を、context.evArgに格納する形に変換します
	 *
	 * <pre>
	 * 例:
	 * $elm.trigger('mouseup', [1, 2, 3]);
	 * なら、イベントハンドラに渡されるイベントは、[event, 1, 2, 3]です。
	 * この[1,2,3]の部分をcontext.evArgに格納してコントローラでバインドしたハンドラに渡す必要があるため、変換が必要になります。
	 * </pre>
	 *
	 * 引数が複数(イベントオブジェクトは除く)ある場合は配列、1つしかない場合はそれをそのまま、無い場合はundefinedを返します。
	 *
	 * @private
	 * @param {argumentsObject} イベントハンドラに渡されたargumentsオブジェクト
	 * @returns {Any} context.evArgに格納する形式のオブジェクト
	 */
	function handlerArgumentsToContextEvArg(args) {
		// 1番目はイベントオブジェクトが入っているので無視して、2番目以降からをevArgに格納する形にする
		// 格納するものがないならundefined
		// 1つだけあるならそれ
		// 2つ以上あるなら配列を返す

		var evArg;
		if (args.length < 3) {
			// 引数部分が1つ以下ならargs[1]をevArgに格納（引数なしならevArgはundefined)
			evArg = args[1];
		} else {
			// 引数が2つ以上なら配列にしてevArgに格納
			evArg = argsToArray(args).slice(1);
		}
		return evArg;
	}

	/**
	 * イベントコンテキストを作成します。
	 *
	 * @param {Object} bindObj バインドオブジェクト
	 * @param {Array} args 1番目にはjQuery.Eventオブジェクト、2番目はjQuery.triggerに渡した引数
	 */
	function createEventContext(bindObj, args) {
		var event = null;
		var evArg = null;
		if (args) {
			event = args[0];
			evArg = handlerArgumentsToContextEvArg(args);
		}
		// イベントオブジェクトの正規化
		normalizeEventObjext(event);

		return new EventContext(bindObj.controller, event, evArg, bindObj.evSelector,
				bindObj.evSelectorType);
	}

	/**
	 * 初期化イベントコンテキストをセットアップします。
	 *
	 * @param {Object} rootController ルートコントローラ
	 */
	function createInitializationContext(rootController) {
		return {
			args: rootController.__controllerContext.args
		};
	}

	/**
	 * コントローラとその子孫コントローラのrootElementにnullをセットします。
	 *
	 * @param {Controller} controller コントローラ
	 */
	function unbindRootElement(controller) {
		for ( var prop in controller) {
			var c = controller[prop];
			if (isChildController(controller, prop)) {
				c.rootElement = null;
				c.view.__controller = null;
				unbindRootElement(c);
			}
		}
	}

	/**
	 * コントローラとその子孫コントローラのrootElementをセットします。
	 *
	 * @param {Controller} controller コントローラ
	 */
	function copyAndSetRootElement(controller) {
		var rootElement = controller.rootElement;
		var meta = controller.__meta;
		for ( var prop in controller) {
			var c = controller[prop];
			if (isChildController(controller, prop)) {
				// __metaが指定されている場合、__metaのrootElementを考慮した要素を取得する
				if (meta && meta[prop] && meta[prop].rootElement) {
					c.rootElement = getBindTarget(meta[prop].rootElement, rootElement, c);
				} else {
					c.rootElement = rootElement;
				}
				c.view.__controller = c;
				copyAndSetRootElement(c);
			}
		}
	}

	/**
	 * コントローラをバインドする対象となる要素を返します。
	 *
	 * @param {String|DOM|jQuery} element セレクタ、DOM要素、もしくはjQueryオブジェクト
	 * @param {DOM} [rootElement] ルートエレメント
	 * @param {Controller} controller コントローラ
	 * @returns {DOM} コントローラのバインド対象である要素
	 */
	function getBindTarget(element, rootElement, controller) {
		if (element == null) {
			throwFwError(ERR_CODE_BIND_TARGET_REQUIRED, [controller.__name]);
		}
		var $targets;
		// elementが文字列でもオブジェクトでもないときはエラー
		if (!isString(element) && typeof element !== 'object') {
			throwFwError(ERR_CODE_BIND_TARGET_ILLEGAL, [controller.__name]);
		}
		if (rootElement) {
			$targets = getTarget(element, rootElement);
		} else {
			$targets = $(element);
		}

		// 要素が存在しないときはエラー
		if ($targets.length === 0) {
			throwFwError(ERR_CODE_BIND_NO_TARGET, [controller.__name]);
		}
		// 要素が複数存在するときはエラー
		if ($targets.length > 1) {
			throwFwError(ERR_CODE_BIND_TOO_MANY_TARGET, [controller.__name]);
		}
		return $targets.get(0);
	}

	/**
	 * イベントハンドラのバインドと__readyイベントを実行します。
	 *
	 * @param {Controller} controller コントローラ
	 */
	function bindAndTriggerReady(controller) {
		bindByBindMap(controller);
		bindDescendantHandlers(controller);

		var managed = controller.__controllerContext.managed;

		// コントローラマネージャの管理対象に追加する
		// フレームワークオプションでコントローラマネージャの管理対象としない(managed:false)の場合、コントローラマネージャに登録しない
		var controllers = h5.core.controllerManager.controllers;
		if ($.inArray(controller, controllers) === -1 && managed !== false) {
			controllers.push(controller);
		}

		// managed=falseの場合、コントローラマネージャの管理対象ではないため、h5controllerboundイベントをトリガしない
		if (managed !== false) {
			// h5controllerboundイベントをトリガ.
			$(controller.rootElement).trigger('h5controllerbound', controller);
		}

		// コントローラの__ready処理を実行
		var initPromises = getDescendantControllerPromises(controller, 'initPromise');
		initPromises.push(controller.initPromise);
		h5.async.when(initPromises).done(function() {
			executeLifecycleEventChain(controller, false);
		}).fail(dummyFailHandler);
	}

	/**
	 * rootController, parentControllerのセットと__initイベントを実行します。
	 *
	 * @param {Controller} controller コントローラ
	 */
	function setRootAndTriggerInit(controller) {
		if (controller.rootController === null) {
			// rootControllerとparentControllerのセット
			initRootAndParentController(controller);
		}
		copyAndSetRootElement(controller);

		// __initイベントの実行
		executeLifecycleEventChain(controller, true);
	}

	/**
	 * h5.core.bindController()のために必要なプロパティをコントローラに追加します。
	 *
	 * @param {Controller} controller コントローラ
	 * @param {Object} param 初期化パラメータ
	 */
	function initInternalProperty(controller, param) {
		var templateDfd = getDeferred();
		templateDfd.resolve();
		controller.__controllerContext.templatePromise = templateDfd.promise();
		controller.__controllerContext.initDfd = getDeferred();
		controller.initPromise = controller.__controllerContext.initDfd.promise();
		controller.__controllerContext.readyDfd = getDeferred();
		controller.readyPromise = controller.__controllerContext.readyDfd.promise();
		controller.isInit = false;
		controller.isReady = false;
		controller.__controllerContext.args = param;
		for ( var prop in controller) {
			if (isChildController(controller, prop)) {
				initInternalProperty(controller[prop]);
			}
		}
	}

	/**
	 * インジケータを呼び出します。
	 *
	 * @param {Controller} controller コントローラ
	 * @param {Object} option インジケータのオプション
	 */
	function callIndicator(controller, option) {
		var target = null;
		var opt = option;

		if ($.isPlainObject(opt)) {
			target = opt.target;
		} else {
			opt = {};
		}
		target = target ? getTarget(target, controller.rootElement, true) : controller.rootElement;
		return h5.ui.indicator.call(controller, target, opt);
	}

	/**
	 * __unbind, __disposeイベントを実行します。
	 *
	 * @param {Controller} controller コントローラ
	 * @param {String} property プロパティ名(__unbind | __dispose)
	 * @returns {Promise[]} Promiseオブジェクト
	 */
	function executeLifeEndChain(controller, property) {
		var promises = [];
		var targets = [];
		var execute = function(parentController) {
			var df = getDeferred();

			targets.push(parentController);
			for ( var prop in parentController) {
				if (isChildController(parentController, prop)) {
					var c = parentController[prop];
					if ($.inArray(c, targets) === -1) {
						execute(c);
					}
				}
			}
			if (parentController[property] && $.isFunction(parentController[property])) {
				var promise = parentController[property]();
				if (h5.async.isPromise(promise)) {
					promise.always(function() {
						df.resolve();
					});
					promises.push(df.promise());
				}
			}
		};
		execute(controller);
		return promises;
	}

	/**
	 * コントローラのリソース解放処理を行います。
	 *
	 * @param {Controller} controller コントローラ
	 */
	function disposeController(controller) {
		var targets = [];
		var dispose = function(parentController) {
			targets.push(parentController);
			if (getByPath('h5.core.view')) {
				parentController.view.clear();
			}
			for ( var prop in parentController) {
				if (parentController.hasOwnProperty(prop)) {
					if (isChildController(parentController, prop)) {
						var c = parentController[prop];
						if ($.inArray(c, targets) === -1) {
							dispose(c);
						}
					}
					parentController[prop] = null;
				}
			}
		};
		dispose(controller);
	}

	/**
	 * 指定されたIDを持つViewインスタンスを返します。 自身が持つViewインスタンスが指定されたIDを持っていない場合、parentControllerのViewインスタンスに対して
	 * 持っているかどうか問い合わせ、持っていればそのインスタンスを、持っていなければ更に上に問い合わせます。
	 * ルートコントローラのViewインスタンスも持っていない場合、h5.core.viewに格納された最上位のViewインスタンスを返します。
	 *
	 * @param {String} templateId テンプレートID
	 * @param {Controller} controller コントローラ
	 */
	function getView(templateId, controller) {
		if (controller.view.__view.isAvailable(templateId)) {
			return controller.view.__view;
		} else if (controller.parentController) {
			return getView(templateId, controller.parentController);
		}
		return h5.core.view;
	}

	/**
	 * 指定されたコントローラがdispose済みかどうか、(非同期の場合はdispose中かどうか)を返します。
	 *
	 * @param {Controller} controller コントローラ
	 */
	function isDisposing(controller) {
		return !controller.__controllerContext || controller.__controllerContext.isDisposing;
	}

	/**
	 * 指定されたコントローラとその子供コントローラのresolve/rejectされていないdeferredをrejectします。
	 *
	 * @param {Controller} controller コントローラ
	 * @param {Any} [errorObj] rejectに渡すオブジェクト
	 */
	function rejectControllerDfd(controller, errorObj) {
		// 指定されたコントローラから見た末裔のコントローラを取得
		var descendantControllers = [];
		var getDescendant = function(con) {
			var hasChildController = false;
			for ( var prop in con) {
				// 子コントローラがあれば再帰的に処理
				if (isChildController(con, prop)) {
					hasChildController = true;
					getDescendant(con[prop]);
				}
			}
			if (!hasChildController) {
				// 子コントローラを持っていないなら、descendantControllersにpush
				descendantControllers.push(con);
			}
		};
		getDescendant(controller);

		var propertyArray = ['initDfd', 'readyDfd'];
		function rejectControllerDfdLoop(con, propertyIndex) {
			var property = propertyArray[propertyIndex];
			var dfd = con.__controllerContext[property];
			if (dfd) {
				if (!isRejected(dfd) && !isResolved(dfd)) {
					dfd.reject(errorObj);
				}
			}
			if (con.parentController) {
				rejectControllerDfdLoop(con.parentController, propertyIndex);
			} else {
				// readyDfdまでrejectしたら終了
				if (propertyIndex < propertyArray.length - 1) {
					// ルートコントローラまで辿ったら、末裔のコントローラに対して次のdfdをrejectさせる
					for ( var i = 0, l = descendantControllers.length; i < l; i++) {
						rejectControllerDfdLoop(descendantControllers[i], propertyIndex + 1);
					}
				}
			}
		}
		for ( var i = 0, l = descendantControllers.length; i < l; i++) {
			rejectControllerDfdLoop(descendantControllers[i], 0);
		}
	}

	/**
	 * インラインコメントテンプレートノードを探す
	 *
	 * @private
	 * @param {Node} node 探索を開始するルートノード
	 * @param {String} id テンプレートID
	 * @retruns {Node} 発見したコメントノード、見つからなかった場合はnull
	 */
	function findCommentBindingTarget(rootNode, id) {
		var childNodes = rootNode.childNodes;
		for ( var i = 0, len = childNodes.length; i < len; i++) {
			var n = childNodes[i];
			if (n.nodeType === 1) {
				//Magic number: 1はNode.ELEMENT_NODE
				var ret = findCommentBindingTarget(n, id);
				if (ret) {
					//深さ優先で探索して見つかったらそこで探索終了
					return ret;
				}
			} else if (n.nodeType === 8) {
				//Magic Number: 8はNode.COMMENT_NODE
				var nodeValue = n.nodeValue;
				if (nodeValue.indexOf(COMMENT_BINDING_TARGET_MARKER) !== 0) {
					//コメントが開始マーカーで始まっていないので探索継続
					continue;
				}

				var beginTagCloseBracketIdx = nodeValue.indexOf('}');
				if (beginTagCloseBracketIdx === -1) {
					//マーカータグが正しく閉じられていない
					continue;
				}

				var beginTag = nodeValue.slice(0, beginTagCloseBracketIdx);

				var matched = beginTag.match(/id="([A-Za-z][\w-:\.]*)"/);
				if (!matched) {
					//idが正しく記述されていない
					continue;
				} else if (matched[1] === id) {
					//探しているidを持つインラインコメントテンプレートノードが見つかったのでリターン
					return n;
				}
			}
		}
		return null;
	}

	// =========================================================================
	//
	// Body
	//
	// =========================================================================
	function controllerFactory(controller, rootElement, controllerName, param, isRoot) {

		/**
		 * コントローラ名.
		 *
		 * @type String
		 * @name __name
		 * @memberOf Controller
		 */
		controller.__name = controllerName;

		/**
		 * テンプレート.
		 *
		 * @type String|String[]
		 * @name __templates
		 * @memberOf Controller
		 */
		controller.__templates = null;

		/**
		 * コントローラがバインドされた要素.
		 *
		 * @type Element
		 * @name rootElement
		 * @memberOf Controller
		 */
		controller.rootElement = rootElement;

		/**
		 * コントローラコンテキスト.
		 *
		 * @private
		 * @memberOf Controller
		 * @name __controllerContext
		 */
		controller.__controllerContext = {

			/**
			 * リスナーを実行するかどうかのフラグ
			 *
			 * @type Boolean
			 */
			executeListeners: true,

			/**
			 * ルートコントローラかどうか
			 *
			 * @type Boolean
			 */
			isRoot: isRoot,

			/**
			 * バインド対象となるイベントハンドラのマップ.
			 *
			 * @type Object
			 */
			bindMap: {},

			/**
			 * アンバインド対象となるイベントハンドラのマップ.
			 *
			 * @type Object
			 */
			unbindMap: {}
		};

		// 初期化パラメータをセット（クローンはしない #163）
		controller.__controllerContext.args = param ? param : null;

		/**
		 * コントローラのライフサイクルイベント__initが終了したかどうかを返します。
		 *
		 * @type Boolean
		 * @memberOf Controller
		 * @name isInit
		 */
		controller.isInit = false;

		/**
		 * コントローラのライフサイクルイベント__readyが終了したかどうかを返します。
		 *
		 * @type Boolean
		 * @memberOf Controller
		 * @name isReady
		 */
		controller.isReady = false;

		/**
		 * 親子関係を持つコントローラ群の一番祖先であるコントローラを返します。祖先がいない場合、自分自身を返します。
		 *
		 * @type Controller
		 * @memberOf Controller
		 * @name rootController
		 */
		controller.rootController = null;

		/**
		 * 親子関係を持つコントローラの親コントローラを返します。親コントローラがいない場合、nullを返します。
		 *
		 * @type Controller
		 * @memberOf Controller
		 * @name parentController
		 */
		controller.parentController = null;

		/**
		 * __templatesに指定したテンプレートファイルの読み込みに、成功または失敗したかの状態を持つPromiseオブジェクト。
		 * このオブジェクトが持つ以下の関数で、状態をチェックすることができます。
		 * <p>
		 * <b>state()</b> <table border="1">
		 * <tr>
		 * <td>戻り値</td>
		 * <td>結果</td>
		 * </tr>
		 * <tr>
		 * <td>"resolved"</td>
		 * <td>読み込みに成功</td>
		 * </tr>
		 * <tr>
		 * <td>"rejected"</td>
		 * <td>読み込みに失敗</td>
		 * </tr>
		 * <tr>
		 * <td>"pending"</td>
		 * <td>読み込みが開始されていないまたは読み込み中</td>
		 * </tr>
		 * </table> 注意: jQuery1.7.x未満の場合、この関数は使用できません。
		 * <p>
		 * <b>isResolved(), isRejected()</b> <table border="1">
		 * <tr>
		 * <td>isResolved()の戻り値</td>
		 * <td>isRejected()の戻り値</td>
		 * <td>結果</td>
		 * </tr>
		 * <tr>
		 * <td>true</td>
		 * <td>false</td>
		 * <td>読み込みに成功</td>
		 * </tr>
		 * <tr>
		 * <td>false</td>
		 * <td>true</td>
		 * <td>読み込みに失敗</td>
		 * </tr>
		 * <tr>
		 * <td>false</td>
		 * <td>false</td>
		 * <td>読み込みが開始されていないまたは読み込み中</td>
		 * </tr>
		 * </table>
		 * <p>
		 * また、preinitPromise.done()に関数を設定すると読み込み成功時に、
		 * preinitPromise.fail()に関数を設定すると読み込み失敗時に、設定した関数を実行します。
		 *
		 * @type Promise
		 * @memberOf Controller
		 * @name preinitPromise
		 */
		controller.preinitPromise = null;

		/**
		 * コントローラのライフサイクルイベント__initについてのPromiseオブジェクトを返します。
		 *
		 * @type Promise
		 * @memberOf Controller
		 * @name initPromise
		 */
		controller.initPromise = null;

		/**
		 * コントローラのライフサイクルイベント__readyについてのPromiseオブジェクトを返します。
		 *
		 * @type Promise
		 * @memberOf Controller
		 * @name readyPromise
		 */
		controller.readyPromise = null;

		/**
		 * コントローラのロガーを返します。
		 *
		 * @type Log
		 * @memberOf Controller
		 * @name log
		 */
		controller.log = h5.log.createLogger(controllerName);

		/**
		 * ビュー操作に関するメソッドを格納しています。
		 *
		 * @namespace
		 * @name view
		 * @memberOf Controller
		 * @see View
		 */
		controller.view = new View(controller);
	}

	function View(controller) {
		// 利便性のために循環参照になってしまうがコントローラの参照を持つ
		this.__controller = controller;
		// Viewモジュールがなければインスタンスを作成しない(できない)
		if (getByPath('h5.core.view')) {
			this.__view = h5.core.view.createView();
		}
	}

	/**
	 * JSDTのフォーマッタが過剰にインデントしてしまうので、独立した関数として記述している
	 *
	 * @private
	 */
	function View_bind(element, context) {
		var target = element;

		if (isString(element) && element.indexOf('h5view#') === 0) {
			//先頭が"h5view#"で始まっている場合、インラインコメントテンプレートへのバインドとみなす
			//（「{h5view id="xxx"}」という記法なので、h5viewタグの特定idをセレクトしているようにみなせる）
			//Magic number: 7は"h5view#"の文字数
			var inlineCommentNode = findCommentBindingTarget(this.__controller.rootElement, element
					.slice(7));

			var rawTmpl = inlineCommentNode.nodeValue;
			var tmpl = rawTmpl.slice(rawTmpl.indexOf('}') + 1);

			//jQueryによる"クリーンな"DOM生成のため、innerHTMLではなくappend()を使う
			var $dummyRoot = $('<div>').append(tmpl);

			target = [];
			var childNodes = $dummyRoot[0].childNodes;
			for ( var i = 0, len = childNodes.length; i < len; i++) {
				target.push(childNodes[i]);
			}

			//ダミールートから要素を外し、インラインテンプレートの直後に要素を挿入
			$dummyRoot.empty();
			var fragment = document.createDocumentFragment();
			for ( var i = 0, len = target.length; i < len; i++) {
				fragment.appendChild(target[i]);
			}

			inlineCommentNode.parentNode.insertBefore(fragment, inlineCommentNode.nextSibling);
		}

		//詳細な引数チェックはView.bindで行う
		return this.__view.bind(target, context);
	}

	$.extend(View.prototype, {
		/**
		 * パラメータで置換された、指定されたテンプレートIDのテンプレートを取得します。
		 *
		 * @param {String} templateId テンプレートID
		 * @param {Object} [param] パラメータ(オブジェクトリテラルで指定)
		 * @returns {String} テンプレート文字列
		 * @function
		 * @name get
		 * @memberOf Controller.view
		 * @see View.get
		 */
		get: function(templateId, param) {
			return getView(templateId, this.__controller).get(templateId, param);
		},

		/**
		 * 要素を指定されたIDのテンプレートで書き換えます。
		 *
		 * @param {String|Element|jQuery} element DOM要素(セレクタ文字列, DOM要素, jQueryオブジェクト)
		 * @param {String} templateId テンプレートID
		 * @param {Object} [param] パラメータ(オブジェクトリテラルで指定)
		 * @function
		 * @name update
		 * @memberOf Controller.view
		 * @see View.update
		 */
		update: function(element, templateId, param) {
			var target = getTarget(element, this.__controller.rootElement, true);
			getView(templateId, this.__controller).update(target, templateId, param);
		},

		/**
		 * 要素の末尾に指定されたIDのテンプレートを挿入します。
		 *
		 * @param {String|Element|jQuery} element DOM要素(セレクタ文字列, DOM要素, jQueryオブジェクト)
		 * @param {String} templateId テンプレートID
		 * @param {Object} [param] パラメータ(オブジェクトリテラルで指定)
		 * @function
		 * @name append
		 * @memberOf Controller.view
		 * @see View.append
		 */
		append: function(element, templateId, param) {
			var target = getTarget(element, this.__controller.rootElement, true);
			getView(templateId, this.__controller).append(target, templateId, param);
		},

		/**
		 * 要素の先頭に指定されたIDのテンプレートを挿入します。
		 *
		 * @param {String|Element|jQuery} element DOM要素(セレクタ文字列, DOM要素, jQueryオブジェクト)
		 * @param {String} templateId テンプレートID
		 * @param {Object} [param] パラメータ(オブジェクトリテラルで指定)
		 * @function
		 * @name prepend
		 * @memberOf Controller.view
		 * @see View.prepend
		 */
		prepend: function(element, templateId, param) {
			var target = getTarget(element, this.__controller.rootElement, true);
			getView(templateId, this.__controller).prepend(target, templateId, param);
		},

		/**
		 * 指定されたパスのテンプレートファイルを非同期で読み込みキャッシュします。
		 *
		 * @param {String|String[]} resourcePaths テンプレートファイル(.ejs)のパス (配列で複数指定可能)
		 * @returns {Promise} Promiseオブジェクト
		 * @function
		 * @name load
		 * @memberOf Controller.view
		 * @see View.load
		 */
		load: function(resourcePaths) {
			return this.__view.load(resourcePaths);
		},

		/**
		 * Viewインスタンスに、指定されたIDとテンプレート文字列からテンプレートを1件登録します。
		 *
		 * @param {String} templateId テンプレートID
		 * @param {String} templateString テンプレート文字列
		 * @function
		 * @name register
		 * @memberOf Controller.view
		 * @see View.register
		 */
		register: function(templateId, templateString) {
			this.__view.register(templateId, templateString);
		},

		/**
		 * テンプレート文字列が、コンパイルできるかどうかを返します。
		 *
		 * @param {String} templateString テンプレート文字列
		 * @returns {Boolean} 渡されたテンプレート文字列がコンパイル可能かどうか。
		 * @function
		 * @name isValid
		 * @memberOf Controller.view
		 * @see View.isValid
		 */
		isValid: function(templateString) {
			return this.__view.isValid(templateString);
		},

		/**
		 * 指定されたテンプレートIDのテンプレートが存在するか判定します。
		 *
		 * @param {String} templateId テンプレートID
		 * @returns {Boolean} 判定結果(存在する: true / 存在しない: false)
		 * @function
		 * @name isAvailable
		 * @memberOf Controller.view
		 * @see View.isAvailable
		 */
		isAvailable: function(templateId) {
			return getView(templateId, this.__controller).isAvailable(templateId);
		},

		/**
		 * 引数に指定されたテンプレートIDをもつテンプレートをキャッシュから削除します。 <br />
		 * 引数を指定しない場合はキャッシュされている全てのテンプレートを削除します。
		 *
		 * @param {String|String[]} [templateId] テンプレートID
		 * @function
		 * @name clear
		 * @memberOf Controller.view
		 * @see View.clear
		 */
		clear: function(templateIds) {
			this.__view.clear(templateIds);
		},

		/**
		 * データバインドを開始します。
		 *
		 * @since 1.1.0
		 * @param {String|Element|Element[]|jQuery} element コメントビュー疑似セレクタ、またはDOM要素(セレクタ文字列, DOM要素,
		 *            DOM要素の配列, jQueryオブジェクト)。コメントビューを指定する場合は、「h5view#xxx」（xxxはid）と記述してください
		 *            （id属性がxxxになっているh5viewタグを指定する、ような記法になっています）。
		 *            DOM要素の配列を指定する場合、全ての要素ノードの親ノードが同じでなければいけません。
		 * @param {Object} context データコンテキストオブジェクト
		 * @function
		 * @name bind
		 * @memberOf Controller.view
		 * @see View.bind
		 */
		bind: View_bind
	});

	/**
	 * コントローラのコンストラクタ
	 * <p>
	 * このオブジェクトは自分でnewすることはありません。 コントローラ化して動作させる場合は<a
	 * href="h5.core.html#controller">h5.core.controller()</a>を使用してください。
	 * </p>
	 *
	 * @param {Element} rootElement コントローラをバインドした要素
	 * @param {String} controllerName コントローラ名
	 * @param {Object} param 初期化パラメータ
	 * @param {Boolean} isRoot ルートコントローラかどうか
	 * @name Controller
	 * @class
	 */
	function Controller(rootElement, controllerName, param, isRoot) {
		return controllerFactory(this, rootElement, controllerName, param, isRoot);
	}
	$.extend(Controller.prototype, {
		/**
		 * コントローラがバインドされた要素内から要素を選択します。
		 *
		 * @param {String} selector セレクタ
		 * @returns {jQuery} セレクタにマッチするjQueryオブジェクト
		 * @memberOf Controller
		 */
		$find: function(selector) {
			return $(this.rootElement).find(selector);
		},

		/**
		 * Deferredオブジェクトを返します。
		 *
		 * @returns {Deferred} Deferredオブジェクト
		 * @memberOf Controller
		 */
		deferred: function() {
			return getDeferred();
		},

		/**
		 * ルート要素を起点に指定されたイベントを実行します。
		 * <p>
		 * 第2引数に指定したparameterオブジェクトは、コントローラのイベントハンドラで受け取るcontext.evArgに格納されます。<br>
		 * parameterに配列を指定した場合は、context.evArgに渡した配列が格納されます。<br>
		 * ただし、
		 *
		 * <pre>
		 * trigger('click', ['a']);
		 * </pre>
		 *
		 * のように、１要素だけの配列を渡した場合は、その中身がcontext.evArgに格納されます。<br>
		 * (jQueryのtriggerと同様です。)
		 * </p>
		 *
		 * @param {String} eventName イベント名
		 * @param {Object} [parameter] パラメータ
		 * @memberOf Controller
		 */
		trigger: function(eventName, parameter) {
			$(this.rootElement).trigger(eventName, parameter);
		},

		/**
		 * 指定された関数に対して、コンテキスト(this)をコントローラに変更して実行する関数を返します。
		 *
		 * @param {Function} func 関数
		 * @return {Function} コンテキスト(this)をコントローラに変更した関数
		 * @memberOf Controller
		 */
		own: function(func) {
			var that = this;
			return function(/* var_args */) {
				func.apply(that, arguments);
			};
		},

		/**
		 * 指定された関数に対して、コンテキスト(this)をコントローラに変更し、元々のthisを第1引数に加えて実行する関数を返します。
		 *
		 * @param {Function} func 関数
		 * @return {Function} コンテキスト(this)をコントローラに変更し、元々のthisを第1引数に加えた関数
		 * @memberOf Controller
		 */
		ownWithOrg: function(func) {
			var that = this;
			return function(/* var_args */) {
				var args = h5.u.obj.argsToArray(arguments);
				args.unshift(this);
				func.apply(that, args);
			};
		},

		/**
		 * コントローラを要素へ再度バインドします。子コントローラでは使用できません。
		 *
		 * @memberOf Controller
		 * @param {String|Element|jQuery} targetElement バインド対象とする要素のセレクタ、DOMエレメント、もしくはjQueryオブジェクト.<br />
		 *            セレクタで指定したときにバインド対象となる要素が存在しない、もしくは2つ以上存在する場合、エラーとなります。
		 * @param {Object} [param] 初期化パラメータ.<br />
		 *            初期化パラメータは __init, __readyの引数として渡されるオブジェクトの argsプロパティとして格納されます。
		 * @returns {Controller} コントローラ.
		 */
		bind: function(targetElement, param) {
			if (!this.__controllerContext.isRoot) {
				throwFwError(ERR_CODE_BIND_ROOT_ONLY);
			}

			var target = getBindTarget(targetElement, null, this);
			this.rootElement = target;
			this.view.__controller = this;
			var args = param ? param : null;
			initInternalProperty(this, args);
			setRootAndTriggerInit(this);
			return this;
		},

		/**
		 * コントローラのバインドを解除します。子コントローラでは使用できません。
		 *
		 * @memberOf Controller
		 */
		unbind: function() {
			if (!this.__controllerContext.isRoot) {
				throwFwError(ERR_CODE_BIND_ROOT_ONLY);
			}

			executeLifeEndChain(this, '__unbind');

			unbindByBindMap(this);
			unbindDescendantHandlers(this);

			this.__controllerContext.unbindMap = {};

			// コントローラマネージャの管理対象から外す.
			var controllers = h5.core.controllerManager.controllers;
			var that = this;
			h5.core.controllerManager.controllers = $.grep(controllers,
					function(controllerInstance) {
						return controllerInstance !== that;
					});

			// h5controllerunboundイベントをトリガ
			$(this.rootElement).trigger('h5controllerunbound', this);

			// rootElementのアンバインド
			this.rootElement = null;
			this.view.__controller = null;
			unbindRootElement(this);
		},

		/**
		 * コントローラのリソースをすべて削除します。<br />
		 * Controller#unbind() の処理を包含しています。
		 *
		 * @param {Any} [errorObj] disposeの際にrejectするdeferredのpromiseのfailハンドラに渡すオブジェクト
		 * @returns {Promise} Promiseオブジェクト
		 * @memberOf Controller
		 */
		dispose: function(errorObj) {
			// disopseされていたら何もしない。
			if (isDisposing(this)) {
				return;
			}
			// rejectまたはfailされていないdeferredをreject()する。
			rejectControllerDfd(this, errorObj);

			this.__controllerContext.isDisposing = 1;
			var dfd = this.deferred();
			this.unbind();
			var that = this;
			var promises = executeLifeEndChain(this, '__dispose');
			h5.async.when(promises).done(function() {
				disposeController(that);
				dfd.resolve();
			});
			return dfd.promise();
		},

		/**
		 * インジケータの生成を上位コントローラまたはフレームワークに移譲します。<br>
		 * 例えば、子コントローラにおいてインジケータのカバー範囲を親コントローラ全体（または画面全体）にしたい場合などに使用します。<br>
		 * このメソッドを実行すると、「triggerIndicator」という名前のイベントが発生します。また、イベント引数としてオプションパラメータを含んだオブジェクトが渡されます。<br>
		 * イベントがdocumentまで到達した場合、フレームワークが自動的にインジケータを生成します。<br>
		 * 途中のコントローラでインジケータを生成した場合はevent.stopPropagation()を呼んでイベントの伝搬を停止し、イベント引数で渡されたオブジェクトの
		 * <code>indicator</code>プロパティに生成したインジケータインスタンスを代入してください。<br>
		 * indicatorプロパティの値がこのメソッドの戻り値となります。<br>
		 *
		 * @param {Object} opt オプション
		 * @param {String} [opt.message] メッセージ
		 * @param {Number} [opt.percent] 進捗を0～100の値で指定する。
		 * @param {Boolean} [opt.block] 操作できないよう画面をブロックするか (true:する/false:しない)
		 * @returns {Indicator} インジケータオブジェクト
		 * @memberOf Controller
		 */
		triggerIndicator: function(opt) {
			var args = {
				indicator: null
			};
			if (opt) {
				$.extend(args, opt);
			}

			$(this.rootElement).trigger(EVENT_NAME_TRIGGER_INDICATOR, [args]);
			return args.indicator;
		},

		/**
		 * 指定された要素に対して、インジケータ(メッセージ・画面ブロック・進捗)の表示や非表示を行うためのオブジェクトを取得します。
		 * <p>
		 * targetには、インジケータを表示するDOMオブジェクト、またはセレクタを指定して下さい。<br>
		 * targetを指定しない場合、コントローラを割り当てた要素(rootElement)に対してインジケータを表示します。
		 * <p>
		 * <h4>注意:</h4>
		 * targetにセレクタを指定した場合、以下の制約があります。
		 * <ul>
		 * <li>コントローラがバインドされた要素内に存在する要素が対象となります。
		 * <li>マッチした要素が複数存在する場合、最初にマッチした要素が対象となります。
		 * </ul>
		 * コントローラがバインドされた要素よりも外にある要素にインジケータを表示したい場合は、セレクタではなく<b>DOMオブジェクト</b>を指定して下さい。
		 * <p>
		 * targetに<b>document</b>、<b>window</b>または<b>body</b>を指定しかつ、blockオプションがtrueの場合、「スクリーンロック」として動作します。<br>
		 * 上記以外のDOM要素を指定した場合は、指定した要素上にインジケータを表示します。
		 * <p>
		 * <b>スクリーンロック</b>とは、コンテンツ領域(スクロールしないと見えない領域も全て含めた領域)全体にオーバーレイを、表示領域(画面に見えている領域)中央にメッセージが表示し、画面を操作できないようにすることです。スマートフォン等タッチ操作に対応する端末の場合、スクロール操作も禁止します。
		 * <h4>使用例</h4>
		 * <b>スクリーンロックとして表示する</b><br>
		 *
		 * <pre>
		 * var indicator = this.indicator({
		 * 	target: document
		 * }).show();
		 * </pre>
		 *
		 * <b>li要素にスロバー(くるくる回るアイコン)を表示してブロックを表示しない場合</b><br>
		 *
		 * <pre>
		 * var indicator = this.indicator({
		 * 	target: 'li',
		 * 	block: false
		 * }).show();
		 * </pre>
		 *
		 * <b>パラメータにPromiseオブジェクトを指定して、done()/fail()の実行と同時にインジケータを除去する</b><br>
		 * resolve() または resolve() が実行されると、画面からインジケータを除去します。
		 *
		 * <pre>
		 * var df = $.Deferred();
		 * var indicator = this.indicator({
		 * 	target: document,
		 * 	promises: df.promise()
		 * }).show();
		 *
		 * setTimeout(function() {
		 * 	df.resolve() // ここでイジケータが除去される
		 * }, 2000);
		 * </pre>
		 *
		 * <b>パラメータに複数のPromiseオブジェクトを指定して、done()/fail()の実行と同時にインジケータを除去する</b><br>
		 * Promiseオブジェクトを配列で複数指定すると、全てのPromiseオブジェクトでresolve()が実行されるか、またはいずれかのPromiseオブジェクトでfail()が実行されるタイミングでインジケータを画面から除去します。
		 *
		 * <pre>
		 * var df = $.Deferred();
		 * var df2 = $.Deferred();
		 * var indicator = this.indicator({
		 * 	target: document,
		 * 	promises: [df.promise(), df2.promise()]
		 * }).show();
		 *
		 * setTimeout(function() {
		 * 	df.resolve()
		 * }, 2000);
		 *
		 * setTimeout(function() {
		 * 	df.resolve() // ここでイジケータが除去される
		 * }, 4000);
		 * </pre>
		 *
		 * @param {Object} [opt] オプション
		 * @param {String|Object} [opt.target] インジケータを表示する対象のDOM要素、jQueryオブジェクトまたはセレクタ
		 * @param {String} [opt.message] スロバーの右側に表示する文字列 (デフォルト:未指定)
		 * @param {Number} [opt.percent] スロバーの中央に表示する数値。0～100で指定する (デフォルト:未指定)
		 * @param {Boolean} [opt.block] 画面を操作できないようオーバーレイ表示するか (true:する/false:しない) (デフォルト:true)
		 * @param {Number} [opt.fadeIn] インジケータをフェードで表示する場合、表示までの時間をミリ秒(ms)で指定する (デフォルト:フェードしない)
		 * @param {Number} [opt.fadeOut] インジケータをフェードで非表示にする場合、非表示までの時間をミリ秒(ms)で指定する (デフォルト:しない)
		 * @param {Promise|Promise[]} [opt.promises] Promiseオブジェクト (Promiseの状態に合わせて自動でインジケータの非表示を行う)
		 * @param {String} [opt.theme] テーマクラス名 (インジケータのにスタイル定義の基点となるクラス名 (デフォルト:'a')
		 * @param {String} [opt.throbber.lines] スロバーの線の本数 (デフォルト:12)
		 * @param {String} [opt.throbber.roundTime] スロバーの白線が1周するまでの時間(ms)
		 *            (このオプションはCSS3Animationを未サポートブラウザのみ有効) (デフォルト:1000)
		 * @returns {Indicator} インジケータオブジェクト
		 * @memberOf Controller
		 * @see Indicator
		 */
		indicator: function(opt) {
			return callIndicator(this, opt);
		},

		/**
		 * コントローラに定義されているリスナーの実行を許可します。
		 *
		 * @memberOf Controller
		 */
		enableListeners: function() {
			setExecuteListenersFlag(this, true);
		},

		/**
		 * コントローラに定義されているリスナーの実行を禁止します。
		 *
		 * @memberOf Controller
		 */
		disableListeners: function() {
			setExecuteListenersFlag(this, false);
		},

		/**
		 * 指定された値をメッセージとして例外をスローします。
		 * <p>
		 * 第一引数がオブジェクトまたは文字列によって、出力される内容が異なります。
		 * <p>
		 * <b>文字列の場合</b><br>
		 * 文字列に含まれる{0}、{1}、{2}...{n} (nは数字)を、第二引数以降に指定した値で置換し、それをメッセージ文字列とします。
		 * <p>
		 * <b>オブジェクトの場合</b><br>
		 * Erorrオブジェクトのdetailプロパティに、このオブジェクトを設定します。
		 *
		 * @memberOf Controller
		 * @param {String|Object} msgOrErrObj メッセージ文字列またはオブジェクト
		 * @param {Any} [var_args] 置換パラメータ(第一引数が文字列の場合のみ使用します)
		 */
		throwError: function(msgOrErrObj, var_args) {
			//引数の個数チェックはthrowCustomErrorで行う
			var args = argsToArray(arguments);
			args.unshift(null);
			this.throwCustomError.apply(null, args);
		},

		/**
		 * 指定された値をメッセージとして例外をスローします。
		 * <p>
		 * このメソッドでスローされたErrorオブジェクトのcustomTypeプロパティには、第一引数で指定した型情報が格納されます。
		 * <p>
		 * 第二引数がオブジェクトまたは文字列によって、出力される内容が異なります。
		 * <p>
		 * <b>文字列の場合</b><br>
		 * 文字列に含まれる{0}、{1}、{2}...{n} (nは数字)を、第二引数以降に指定した値で置換し、それをメッセージ文字列とします。
		 * <p>
		 * <b>オブジェクトの場合</b><br>
		 * Erorrオブジェクトのdetailプロパティに、このオブジェクトを設定します。
		 *
		 * @memberOf Controller
		 * @param {String} customType 型情報
		 * @param {String|Object} msgOrErrObj メッセージ文字列またはオブジェクト
		 * @param {Any} [var_args] 置換パラメータ(第一引数が文字列の場合のみ使用します)
		 */
		throwCustomError: function(customType, msgOrErrObj, var_args) {
			if (arguments.length < 2) {
				throwFwError(ERR_CODE_TOO_FEW_ARGUMENTS);
			}

			var error = null;

			if (msgOrErrObj && isString(msgOrErrObj)) {
				error = new Error(format.apply(null, argsToArray(arguments).slice(1)));
			} else {
				// 引数を渡さないと、iOS4は"unknown error"、その他のブラウザは空文字が、デフォルトのエラーメッセージとして入る
				error = new Error();
				error.detail = msgOrErrObj;
			}
			error.customType = customType;
			throw error;
		}
	});

	/**
	 * コントローラマネージャクラス
	 *
	 * @name ControllerManager
	 * @class
	 */
	function ControllerManager() {
		this.rootElement = document;
		this.controllers = [];

		/**
		 * triggerIndicatorイベントハンドラ
		 *
		 * @param {EventContext} context
		 * @memberOf ControllerManager
		 * @private
		 */
		$(document).bind(EVENT_NAME_TRIGGER_INDICATOR, function(event, opt) {
			if (opt.target == null) {
				opt.target = document;
			}
			opt.indicator = callIndicator(this, opt);
			event.stopPropagation();
		});

	}
	$.extend(ControllerManager.prototype, {
		/**
		 * 現在動作しているすべてのコントローラのインスタンスの配列を返します。<br>
		 * 子コントローラは含まれません。すなわち、ルートコントローラのみが含まれます。
		 *
		 * @returns {Controller[]} コントローラ配列
		 * @memberOf ControllerManager
		 */
		getAllControllers: function() {
			return this.controllers;
		},

		/**
		 * 指定した要素にバインドされているすべてのコントローラを返します。バインドされているコントローラがない場合は空の配列が返ります。<br>
		 * 子コントローラは含まれません。
		 *
		 * @param {String|Element|jQuery} rootElement 要素
		 * @returns {Controller[]} バインドされているコントローラの配列
		 * @memberOf ControllerManager
		 */
		getControllers: function(rootElement) {
			var target = $(rootElement)[0];
			var controllers = this.controllers;
			var ret = [];
			for ( var i = 0, len = controllers.length; i < len; i++) {
				if (target === controllers[i].rootElement) {
					ret.push(controllers[i]);
				}
			}
			return ret;
		}
	});

	h5.u.obj.expose('h5.core', {
		/**
		 * コントローラマネージャ
		 *
		 * @name controllerManager
		 * @type ControllerManager
		 * @memberOf h5.core
		 */
		controllerManager: new ControllerManager()
	});

	// プロパティ重複チェック用のコントローラプロパティマップを作成
	var controllerPropertyMap = {};
	var tempInstance = new Controller(null, 'a');
	for ( var p in tempInstance) {
		if (tempInstance.hasOwnProperty(p) && p !== '__name' && p !== '__templates'
				&& p !== '__meta') {
			controllerPropertyMap[p] = 1;
		}
	}
	tempInstance = null;
	var proto = Controller.prototype;
	for ( var p in proto) {
		if (proto.hasOwnProperty(p)) {
			controllerPropertyMap[p] = 1;
		}
	}
	proto = null;

	/**
	 * コントローラのファクトリ
	 *
	 * @param {String|Element|jQuery} targetElement バインド対象とする要素のセレクタ、DOMエレメント、もしくはjQueryオブジェクト.
	 * @param {Object} controllerDefObj コントローラ定義オブジェクト
	 * @param {Object} [param] 初期化パラメータ.
	 */
	// fwOptは内部的に使用している.
	function createAndBindController(targetElement, controllerDefObj, param, fwOpt) {
		// 内部から再帰的に呼び出された場合は、fwOpt.isInternalが指定されているはずなので、ルートコントローラかどうかはfwOpt.isInternalで判別できる
		var isRoot = !fwOpt || !fwOpt.isInternal;

		// コントローラ名
		var controllerName = controllerDefObj.__name;
		if (!isString(controllerName) || $.trim(controllerName).length === 0) {
			throwFwError(ERR_CODE_INVALID_CONTROLLER_NAME, null, {
				controllerDefObj: controllerDefObj
			});
		}

		fwLogger.debug(FW_LOG_INIT_CONTROLLER_BEGIN, controllerName);

		// 初期化パラメータがオブジェクトかどうかチェック
		if (param && !$.isPlainObject(param)) {
			throwFwError(ERR_CODE_CONTROLLER_INVALID_INIT_PARAM, [controllerName], {
				controllerDefObj: controllerDefObj
			});
		}

		// 既にコントローラ化されているかどうかチェック
		if (controllerDefObj.__controllerContext) {
			throwFwError(ERR_CODE_CONTROLLER_ALREADY_CREATED, null, {
				controllerDefObj: controllerDefObj
			});
		}

		// バインド対象となる要素のチェック
		// 文字列、オブジェクト(配列含む)でない場合はエラー (それぞれ、セレクタ、DOMオブジェクト(またはjQueryオブジェクト)を想定している)
		if (isRoot || targetElement) {
			if (targetElement == null) {
				throwFwError(ERR_CODE_BIND_TARGET_REQUIRED, [controllerName], {
					controllerDefObj: controllerDefObj
				});
			} else if (isString(targetElement) || typeof targetElement === 'object') {
				var $bindTargetElement = $(targetElement);
				// 要素が1つでない場合はエラー
				if ($bindTargetElement.length === 0) {
					throwFwError(ERR_CODE_BIND_NO_TARGET, [controllerName], {
						controllerDefObj: controllerDefObj
					});
				}
				if ($bindTargetElement.length > 1) {
					throwFwError(ERR_CODE_BIND_TOO_MANY_TARGET, [controllerName], {
						controllerDefObj: controllerDefObj
					});
				}
			} else {
				throwFwError(ERR_CODE_BIND_TARGET_ILLEGAL, [controllerName], {
					controllerDefObj: controllerDefObj
				});
			}
		}

		// コントローラの循環参照チェック
		if (checkControllerCircularRef(controllerDefObj)) {
			throwFwError(ERR_CODE_CONTROLLER_CIRCULAR_REF, [controllerName], {
				controllerDefObj: controllerDefObj
			});
		}

		// ロジックの循環参照チェック
		if (checkLogicCircularRef(controllerDefObj)) {
			throwFwError(ERR_CODE_LOGIC_CIRCULAR_REF, [controllerName], {
				controllerDefObj: controllerDefObj
			});
		}

		var clonedControllerDef = $.extend(true, {}, controllerDefObj);
		var controller = new Controller(targetElement ? $(targetElement).get(0) : null,
				controllerName, param, isRoot);

		var templates = controllerDefObj.__templates;
		var templateDfd = getDeferred();
		var templatePromise = templateDfd.promise();
		var preinitDfd = getDeferred();
		var preinitPromise = preinitDfd.promise();

		controller.__controllerContext.preinitDfd = preinitDfd;
		controller.preinitPromise = preinitPromise;
		controller.__controllerContext.initDfd = getDeferred();

		// initPromiseが失敗してもcommonFailHandlerを発火させないようにするため、dummyのfailハンドラを登録する
		controller.initPromise = controller.__controllerContext.initDfd.promise().fail(
				dummyFailHandler);
		controller.__controllerContext.readyDfd = getDeferred();
		controller.readyPromise = controller.__controllerContext.readyDfd.promise();

		if (!isRoot) {
			// ルートコントローラでないなら、readyPromiseの失敗でcommonFailHandlerを発火させないようにする
			controller.readyPromise.fail(dummyFailHandler);
		}
		/* del begin */
		else {
			// ルートコントローラなら、readyPromise.doneのタイミングで、ログを出力する
			controller.readyPromise.done(function() {
				fwLogger.info(FW_LOG_INIT_CONTROLLER_COMPLETE, controllerName);
			});
		}
		/* del end */
		if (templates && templates.length > 0) {
			// テンプレートがあればロード
			var viewLoad = function(count) {
				// Viewモジュールがない場合、この直後のloadでエラーが発生してしまうためここでエラーを投げる。
				if (!getByPath('h5.core.view')) {
					throwFwError(ERR_CODE_NOT_VIEW);
				}
				var vp = controller.view.load(templates);
				vp.then(function(result) {
					/* del begin */
					if (templates && templates.length > 0) {
						fwLogger.debug(FW_LOG_TEMPLATE_LOADED, controllerName);
					}
					/* del end */
					templateDfd.resolve();
				}, function(result) {
					// テンプレートのロードをリトライする条件は、リトライ回数が上限回数未満、かつ
					// jqXhr.statusが"0"、もしくは"12029"であること。
					// jqXhr.statusの値の根拠は、IE以外のブラウザだと通信エラーの時に"0"になっていること、
					// IEの場合は、コネクションが繋がらない時のコードが"12029"であること。
					// 12000番台すべてをリトライ対象としていないのは、何度リトライしても成功しないエラーが含まれていることが理由。
					// WinInet のエラーコード(12001 - 12156):
					// http://support.microsoft.com/kb/193625/ja
					var errorObj = result.detail.error;
					var jqXhrStatus = errorObj ? errorObj.status : null;
					if (count === TEMPLATE_LOAD_RETRY_COUNT || jqXhrStatus !== 0
							&& jqXhrStatus !== 12029) {
						fwLogger.error(FW_LOG_TEMPLATE_LOAD_FAILED, controllerName,
								result.detail.url);
						result.controllerDefObject = controllerDefObj;
						setTimeout(function() {
							templateDfd.reject(result);
						}, 0);
						return;
					}
					setTimeout(function() {
						viewLoad(++count);
					}, TEMPLATE_LOAD_RETRY_INTERVAL);
				});
			};
			viewLoad(0);
		} else {
			// テンプレートがない場合は、resolve()しておく
			templateDfd.resolve();
		}

		// テンプレートプロミスのハンドラ登録
		templatePromise.done(function() {
			if (!isDisposing(controller)) {
				preinitDfd.resolve();
			}
		}).fail(function(e) {
			preinitDfd.reject(e);
			if (controller.rootController && !isDisposing(controller.rootController)) {
				fwLogger.error(FW_LOG_INIT_CONTROLLER_ERROR, controller.rootController.__name);
			}
			// 同じrootControllerを持つ他の子のdisposeによって、
			// controller.rootControllerがnullになっている場合があるのでそのチェックをしてからdisposeする
			controller.rootController && controller.rootController.dispose(e);
		});

		for ( var prop in clonedControllerDef) {
			if (controllerPropertyMap[prop]) {
				throwFwError(ERR_CODE_CONTROLLER_SAME_PROPERTY, [controllerName, prop], {
					controllerDefObj: controllerDefObj
				});
			} else if (isLifecycleProperty(clonedControllerDef, prop)) {
				// ライフサイクルイベント
				controller[prop] = weaveControllerAspect(clonedControllerDef, prop);
			} else if (isEventHandler(clonedControllerDef, prop)) {
				// イベントハンドラ
				var propTrimmed = $.trim(prop);
				var lastIndex = propTrimmed.lastIndexOf(' ');
				var selector = $.trim(propTrimmed.substring(0, lastIndex));
				var eventName = $.trim(propTrimmed.substring(lastIndex + 1, propTrimmed.length));
				if (isBindRequested(eventName)) {
					eventName = '[' + $.trim(trimBindEventBracket(eventName)) + ']';
				}

				if (isGlobalSelector(selector)) {
					var selectTarget = trimGlobalSelectorBracket(selector);
					if (selectTarget === 'this') {
						throwFwError(ERR_CODE_EVENT_HANDLER_SELECTOR_THIS, [controllerName], {
							controllerDefObj: controllerDefObj
						});
					}
				}
				var bindMap = controller.__controllerContext.bindMap;
				if (!bindMap[selector]) {
					bindMap[selector] = {};
				}
				if (bindMap[selector][eventName]) {
					throwFwError(ERR_CODE_SAME_EVENT_HANDLER,
							[controllerName, selector, eventName], {
								controllerDefObj: controllerDefObj
							});
				}
				var weavedFunc = weaveControllerAspect(clonedControllerDef, prop, true);
				bindMap[selector][eventName] = weavedFunc;
				controller[prop] = weavedFunc;
			} else if (endsWith(prop, SUFFIX_CONTROLLER) && clonedControllerDef[prop]
					&& !$.isFunction(clonedControllerDef[prop])) {
				// 子コントローラをバインドする。fwOpt.isInternalを指定して、子コントローラであるかどうか分かるようにする
				var c = createAndBindController(null,
						$.extend(true, {}, clonedControllerDef[prop]), param, $.extend({
							isInternal: true
						}, fwOpt));
				controller[prop] = c;
			} else if (endsWith(prop, SUFFIX_LOGIC) && clonedControllerDef[prop]
					&& !$.isFunction(clonedControllerDef[prop])) {
				// ロジック
				var logicTarget = clonedControllerDef[prop];
				var logic = createLogic(logicTarget);
				controller[prop] = logic;
			} else if ($.isFunction(clonedControllerDef[prop])) {
				// イベントハンドラではないメソッド
				controller[prop] = weaveControllerAspect(clonedControllerDef, prop);
			} else {
				// その他プロパティ
				controller[prop] = clonedControllerDef[prop];
			}
		}

		// __metaのチェック
		var meta = controller.__meta;
		if (meta) {
			for ( var prop in meta) {
				var c = controller[prop];
				if (c === undefined) {
					throwFwError(ERR_CODE_CONTROLLER_META_KEY_INVALID, [controllerName, prop], {
						controllerDefObj: controllerDefObj
					});
				}
				if (c === null) {
					throwFwError(ERR_CODE_CONTROLLER_META_KEY_NULL, [controllerName, prop], {
						controllerDefObj: controllerDefObj
					});
				}
				if (Controller.prototype.constructor !== c.constructor) {
					throwFwError(ERR_CODE_CONTROLLER_META_KEY_NOT_CONTROLLER,
							[controllerName, prop], {
								controllerDefObj: controllerDefObj
							});
				}
			}
		}

		// __constructがあれば実行。ここまでは完全に同期処理になる。
		if (controller.__construct) {
			controller.__construct(createInitializationContext(controller));
		}

		if (isDisposing(controller)) {
			return null;
		}

		// コントローラマネージャの管理対象とするか判定する
		if (fwOpt && 'managed' in fwOpt) {
			controller.__controllerContext.managed = fwOpt.managed;
		}

		// ルートコントローラなら、ルートをセット
		if (controller.__controllerContext.isRoot) {
			setRootAndTriggerInit(controller);
		}
		return controller;
	}

	// fwOptを引数に取る、コントローラ化を行うメソッドを、h5internal.core.controllerInternalとして内部用に登録
	h5internal.core.controllerInternal = createAndBindController;

	/**
	 * オブジェクトのロジック化を行います。
	 *
	 * @param {Object} logicDefObj ロジック定義オブジェクト
	 * @returns {Logic}
	 * @name logic
	 * @function
	 * @memberOf h5.core
	 */
	function createLogic(logicDefObj) {
		var logicName = logicDefObj.__name;
		if (!isString(logicName) || $.trim(logicName).length === 0) {
			throwFwError(ERR_CODE_INVALID_LOGIC_NAME, null, {
				logicDefObj: logicDefObj
			});
		}
		if (logicDefObj.__logicContext) {
			throwFwError(ERR_CODE_LOGIC_ALREADY_CREATED, null, {
				logicDefObj: logicDefObj
			});
		}
		var logic = weaveLogicAspect($.extend(true, {}, logicDefObj));
		logic.deferred = getDeferred;
		logic.log = h5.log.createLogger(logicName);
		logic.__logicContext = {};

		for ( var prop in logic) {
			if (logic.hasOwnProperty(prop) && endsWith(prop, SUFFIX_LOGIC)) {
				var target = logic[prop];
				logic[prop] = createLogic(target);
			}
		}
		return logic;
	}

	// =============================
	// Expose to window
	// =============================

	/**
	 * Core MVCの名前空間
	 *
	 * @name core
	 * @memberOf h5
	 * @namespace
	 */
	h5.u.obj.expose('h5.core', {
		/**
		 * オブジェクトのコントローラ化と、要素へのバインドを行います。
		 *
		 * @param {String|Element|jQuery} targetElement バインド対象とする要素のセレクタ、DOMエレメント、もしくはjQueryオブジェクト..<br />
		 *            セレクタで指定したときにバインド対象となる要素が存在しない、もしくは2つ以上存在する場合、エラーとなります。
		 * @param {Object} controllerDefObj コントローラ定義オブジェクト
		 * @param {Object} [param] 初期化パラメータ.<br />
		 *            初期化パラメータは __construct, __init, __readyの引数として渡されるオブジェクトの argsプロパティとして格納されます。
		 * @returns {Controller} コントローラ
		 * @name controller
		 * @function
		 * @memberOf h5.core
		 */
		controller: function(targetElement, controllerDefObj, param) {
			if (arguments.length < 2) {
				throwFwError(ERR_CODE_CONTROLLER_TOO_FEW_ARGS);
			}

			return createAndBindController(targetElement, controllerDefObj, param);
		},

		logic: createLogic,

		/**
		 * コントローラ、ロジックを__nameで公開します。<br />
		 * 例：__nameが"sample.namespace.controller.TestController"の場合、window.sample.namespace.controller.TestController
		 * で グローバルから辿れるようにします。
		 *
		 * @param {Controller|Logic} obj コントローラ、もしくはロジック
		 * @name expose
		 * @function
		 * @memberOf h5.core
		 */
		expose: function(obj) {
			var objName = obj.__name;
			if (!objName) {
				throwFwError(ERR_CODE_EXPOSE_NAME_REQUIRED, null, {
					target: obj
				});
			}
			var lastIndex = objName.lastIndexOf('.');
			if (lastIndex === -1) {
				window[objName] = obj;
			} else {
				var ns = objName.substr(0, lastIndex);
				var key = objName.substr(lastIndex + 1, objName.length);
				var nsObj = {};
				nsObj[key] = obj;
				h5.u.obj.expose(ns, nsObj);
			}

		}
	});
})();


/* ------ h5.core.data_observables ------ */
(function() {
	// =========================================================================
	//
	// Constants
	//
	// =========================================================================

	// =============================
	// Production
	// =============================

	/**
	 * createObservableItemに渡された引数がオブジェクトでない
	 */
	var ERR_CODE_REQUIRE_SCHEMA = 15100;

	/**
	 * createObservableItemに指定されたスキーマのエラー
	 */
	var ERR_CODE_INVALID_SCHEMA = 15101;

	/**
	 * スキーマ違反の値がセットされた
	 */
	var ERR_CODE_INVALID_ITEM_VALUE = 15102;

	/**
	 * 依存項目にセットされた
	 */
	var ERR_CODE_DEPEND_PROPERTY = 15103;

	/**
	 * ObservableItemでスキーマで定義されていない値にセットされた
	 */
	var ERR_CODE_CANNOT_SET_NOT_DEFINED_PROPERTY = 15104;

	/**
	 * schemaに定義されていないプロパティを取得した
	 */
	var ERR_CODE_CANNOT_GET_NOT_DEFINED_PROPERTY = 15105;

	/**
	 * addEventListenerに不正な引数が渡された
	 */
	var ERR_CODE_INVALID_ARGS_ADDEVENTLISTENER = 15106;

	/**
	 * depend.calcが制約を満たさない値を返している
	 */
	var ERR_CODE_CALC_RETURNED_INVALID_VALUE = 15107;

	/**
	 * 引数が不正
	 */
	var ERR_CODE_INVALID_ARGUMENT = 15108;

	// ---------------------------
	// スキーマのエラーコード(detailに入れるメッセージID)
	// ---------------------------

	// このメッセージはDataModelで共通で使用するためh5scopeにexposeしています
	// h5internal.core.data.DESCRIPTOR_VALIDTATION_ERROR
	/**
	 * ID指定されたプロパティが重複している
	 */
	var SCHEMA_ERR_DETAIL_DUPLICATED_ID = 15800;

	/**
	 * ID指定されたプロパティがない
	 */
	var SCHEMA_ERR_DETAIL_NO_ID = 15801;

	/**
	 * プロパティ名が不正
	 */
	var SCHEMA_ERR_DETAIL_INVALID_PROPERTY_NAME = 15802;

	/**
	 * id指定されたプロパティにdependが指定されている
	 */
	var SCHEMA_ERR_DETAIL_ID_DEPEND = 15803;

	/**
	 * depend.onに指定されたプロパティが存在しない
	 */
	var SCHEMA_ERR_DETAIL_DEPEND_ON = 15804;

	/**
	 * depend.calcに関数が指定されていない
	 */
	var SCHEMA_ERR_DETAIL_DEPEND_CALC = 15805;

	/**
	 * typeに文字列が指定されていない
	 */
	var SCHEMA_ERR_DETAIL_INVALID_TYPE = 15806;

	/**
	 * type文字列が不正
	 */
	var SCHEMA_ERR_DETAIL_TYPE = 15807;

	/**
	 * typeに指定されたデータモデルが存在しない
	 */
	var SCHEMA_ERR_DETAIL_TYPE_DATAMODEL = 15808;

	/**
	 * type:enumなのにenumValueが指定されていない
	 */
	var SCHEMA_ERR_DETAIL_TYPE_ENUM_NO_ENUMVALUE = 15809;

	/**
	 * constraintにオブジェクトが指定されていない
	 */
	var SCHEMA_ERR_DETAIL_INVALID_CONSTRAINT = 15810;

	/**
	 * constraint.notNullの指定が不正
	 */
	var SCHEMA_ERR_DETAIL_INVALID_CONSTRAINT_NOTNULL_NOTEMPTY = 15811;

	/**
	 * min-maxに数値が入力されなかった時のエラー
	 */
	var SCHEMA_ERR_DETAIL_INVALID_CONSTRAINT_MIN_MAX = 15812;

	/**
	 * typeがinteger,numberじゃないのにconstraint.min/max を指定されたときのエラー
	 */
	var SCHEMA_ERR_DETAIL_TYPE_CONSTRAINT = 15813;

	/**
	 * constraint.patternが正規表現じゃない
	 */
	var SCHEMA_ERR_DETAIL_INVALID_CONSTRAINT_PATTERN = 15814;

	/**
	 * minLength/maxLengthに0以上の整数値以外の値が渡された
	 */
	var SCHEMA_ERR_DETAIL_INVALID_CONSTRAINT_MINLENGTH_MAXLENGTH = 15815;

	/**
	 * constraintの指定に矛盾がある場合(mix > maxなど)
	 */
	var SCHEMA_ERR_DETAIL_CONSTRAINT_CONFLICT = 15816;

	/**
	 * typeがenumでないのにenumValueが指定されている
	 */
	var SCHEMA_ERR_DETAIL_ENUMVALUE_TYPE = 15817;

	/**
	 * enumValueが配列でない、または空配列
	 */
	var SCHEMA_ERR_DETAIL_INVALID_ENUMVALUE = 15818;

	/**
	 * id項目にdefaultValueが設定されている
	 */
	var SCHEMA_ERR_DETAIL_DEFAULTVALUE_ID = 15819;

	/**
	 * defaultValueに設定された値がtype,constraintに指定された条件を満たしていない
	 */
	var SCHEMA_ERR_DETAIL_INVALIDATE_DEFAULTVALUE = 15820;

	/**
	 * ID項目のconstraintに不正な指定がある
	 */
	var SCHEMA_ERR_DETAIL_CONSTRAINT_CONFLICT_ID = 15821;

	/**
	 * defaultValue指定されたプロパティにdependが指定されている
	 */
	var SCHEMA_ERR_DETAIL_DEFAULTVALUE_DEPEND = 15822;

	/**
	 * dependの依存関係が循環している
	 */
	var SCHEMA_ERR_DETAIL_DEPEND_CIRCULAR_REF = 15823;

	// =============================
	// Development Only
	// =============================

	/* del begin */
	/**
	 * 各エラーコードに対応するメッセージ
	 */
	var errMsgMap = {};
	errMsgMap[ERR_CODE_REQUIRE_SCHEMA] = 'createObservableItemの引数にはスキーマ定義オブジェクトを指定する必要があります。';
	errMsgMap[ERR_CODE_INVALID_SCHEMA] = 'createObservableItemの引数に指定されたスキーマ定義オブジェクトが不正です。';
	errMsgMap[ERR_CODE_INVALID_ITEM_VALUE] = 'Itemのsetterに渡された値がスキーマで指定された型・制約に違反しています。 違反したプロパティ={0}';
	errMsgMap[ERR_CODE_DEPEND_PROPERTY] = 'depend指定されているプロパティに値をセットすることはできません。 違反したプロパティ={0}';
	errMsgMap[ERR_CODE_CANNOT_SET_NOT_DEFINED_PROPERTY] = 'スキーマに定義されていないプロパティに値をセットすることはできません。違反したプロパティ={0}';
	errMsgMap[ERR_CODE_CANNOT_GET_NOT_DEFINED_PROPERTY] = 'スキーマに定義されていないプロパティは取得できません。違反したプロパティ={0}';
	errMsgMap[ERR_CODE_INVALID_ARGS_ADDEVENTLISTENER] = 'addEventListenerには、イベント名(文字列)、イベントリスナ(関数)を渡す必要があります。';
	errMsgMap[ERR_CODE_CALC_RETURNED_INVALID_VALUE] = 'calcで返却された値が、スキーマで指定された型・制約に違反しています。プロパティ={0}、返却値={1}';
	errMsgMap[ERR_CODE_INVALID_ARGUMENT] = '引数が不正です。引数位置={0}、値={1}';

	// メッセージの登録
	addFwErrorCodeMap(errMsgMap);

	/**
	 * スキーマのエラーメッセージ h5.core.dataでも使用するので、exposeする
	 */
	var DESCRIPTOR_VALIDATION_ERROR_MSGS = {};
	DESCRIPTOR_VALIDATION_ERROR_MSGS[SCHEMA_ERR_DETAIL_DUPLICATED_ID] = 'ID指定されているプロパティが複数あります。ID指定は1つのプロパティのみに指定してください。';
	DESCRIPTOR_VALIDATION_ERROR_MSGS[SCHEMA_ERR_DETAIL_NO_ID] = 'ID指定されているプロパティがありません。ID指定は必須です。';
	DESCRIPTOR_VALIDATION_ERROR_MSGS[SCHEMA_ERR_DETAIL_INVALID_PROPERTY_NAME] = '{0}をプロパティ名に指定できません。半角英数字,_,$ で構成される文字列で、先頭は数字以外である必要があります。';
	DESCRIPTOR_VALIDATION_ERROR_MSGS[SCHEMA_ERR_DETAIL_ID_DEPEND] = '"{0}"プロパティの定義にエラーがあります。id指定されたプロパティにdependを指定することはできません。';
	DESCRIPTOR_VALIDATION_ERROR_MSGS[SCHEMA_ERR_DETAIL_DEPEND_ON] = '"{0}"プロパティプロパティの定義にエラーがあります。depend.onに指定されたプロパティが存在しません。';
	DESCRIPTOR_VALIDATION_ERROR_MSGS[SCHEMA_ERR_DETAIL_DEPEND_CALC] = '"{0}"プロパティプロパティの定義にエラーがあります。depend.calcには関数を指定する必要があります';
	DESCRIPTOR_VALIDATION_ERROR_MSGS[SCHEMA_ERR_DETAIL_INVALID_TYPE] = '"{0}"プロパティプロパティの定義にエラーがあります。typeは文字列で指定して下さい。';
	DESCRIPTOR_VALIDATION_ERROR_MSGS[SCHEMA_ERR_DETAIL_TYPE] = 'プロパティの定義にエラーがあります。typeに指定された文字列が不正です "{1}"';
	DESCRIPTOR_VALIDATION_ERROR_MSGS[SCHEMA_ERR_DETAIL_TYPE_DATAMODEL] = '"{0}"プロパティの定義にエラーがあります。 typeに指定されたデータモデル"{1}"は存在しません';
	DESCRIPTOR_VALIDATION_ERROR_MSGS[SCHEMA_ERR_DETAIL_TYPE_ENUM_NO_ENUMVALUE] = '"{0}"プロパティの定義にエラーがあります。 タイプにenumを指定する場合はenumValueも指定する必要があります';
	DESCRIPTOR_VALIDATION_ERROR_MSGS[SCHEMA_ERR_DETAIL_INVALID_CONSTRAINT] = '"{0}"プロパティの定義にエラーがあります。 constraintはオブジェクトで指定してください';
	DESCRIPTOR_VALIDATION_ERROR_MSGS[SCHEMA_ERR_DETAIL_INVALID_CONSTRAINT_NOTNULL_NOTEMPTY] = '"{0}"プロパティの定義にエラーがあります。 constraint.{1} の指定が不正です。trueまたはfalseで指定してください。';
	DESCRIPTOR_VALIDATION_ERROR_MSGS[SCHEMA_ERR_DETAIL_INVALID_CONSTRAINT_MIN_MAX] = '"{0}"プロパティの定義にエラーがあります。 constraint.{1} は、数値で指定してください。typeにintegerを指定している場合は整数値で指定する必要があります';
	DESCRIPTOR_VALIDATION_ERROR_MSGS[SCHEMA_ERR_DETAIL_TYPE_CONSTRAINT] = '"{0}"プロパティの定義にエラーがあります。 constraint.{1} は、type:{2}の項目に対して指定することはできません。';
	DESCRIPTOR_VALIDATION_ERROR_MSGS[SCHEMA_ERR_DETAIL_INVALID_CONSTRAINT_PATTERN] = '"{0}"プロパティ constraint.{1}は正規表現オブジェクトで指定してください。';
	DESCRIPTOR_VALIDATION_ERROR_MSGS[SCHEMA_ERR_DETAIL_INVALID_CONSTRAINT_MINLENGTH_MAXLENGTH] = '"{0}"プロパティの定義にエラーがあります。 constraint.{1}には正の整数を指定してください';
	DESCRIPTOR_VALIDATION_ERROR_MSGS[SCHEMA_ERR_DETAIL_CONSTRAINT_CONFLICT] = '"{0}"プロパティの定義にエラーがあります。 constraintに矛盾する指定があります。{1},{2}';
	DESCRIPTOR_VALIDATION_ERROR_MSGS[SCHEMA_ERR_DETAIL_ENUMVALUE_TYPE] = '"{0}"プロパティの定義にエラーがあります。 enumValueはtypeに"enum"またはその配列が指定されている場合のみ指定可能です';
	DESCRIPTOR_VALIDATION_ERROR_MSGS[SCHEMA_ERR_DETAIL_INVALID_ENUMVALUE] = '"{0}"プロパティの定義にエラーがあります。 enumValueはnull,undefinedを含まない長さ1以上の配列を指定してください';
	DESCRIPTOR_VALIDATION_ERROR_MSGS[SCHEMA_ERR_DETAIL_DEFAULTVALUE_ID] = '"{0}"プロパティの定義にエラーがあります。id指定した項目にdefaultValueを設定することはできません';
	DESCRIPTOR_VALIDATION_ERROR_MSGS[SCHEMA_ERR_DETAIL_INVALIDATE_DEFAULTVALUE] = '"{0}"プロパティのdefaultValueに設定された値"{1}"は、typeまたはconstraintに定義された条件を満たしていません';
	DESCRIPTOR_VALIDATION_ERROR_MSGS[SCHEMA_ERR_DETAIL_CONSTRAINT_CONFLICT_ID] = '"{0}"プロパティの定義にエラーがあります。id指定された項目にconstraint.{1}:{2}を指定することはできません';
	DESCRIPTOR_VALIDATION_ERROR_MSGS[SCHEMA_ERR_DETAIL_DEFAULTVALUE_DEPEND] = '"{0}"プロパティの定義にエラーがあります。dependが指定された項目にdefaultValueを指定することはできません。';
	DESCRIPTOR_VALIDATION_ERROR_MSGS[SCHEMA_ERR_DETAIL_DEPEND_CIRCULAR_REF] = '"{0}"プロパティの定義にエラーがあります。depend.onに指定されたプロパティの依存関係が循環しています';
	/* del end */


	// =========================================================================
	//
	// Cache
	//
	// =========================================================================
	// =========================================================================
	//
	// Privates
	//
	// =========================================================================
	// =============================
	// Variables
	// =============================
	// =============================
	// Functions
	// =============================
	/**
	 * Itemとプロパティ名を引数にとり、_valuesに格納されている値を返す
	 *
	 * @private
	 * @param {DataItem|ObservableItem} item DataItemまたはObservableItem
	 * @param {String} prop プロパティ名
	 * @returns {Any} Item._values[prop]
	 */
	function getValue(item, prop) {
		return item._values[prop];
	}

	/**
	 * Itemとプロパティ名と値引数にとり、Item._valuesに値を格納する
	 *
	 * @private
	 * @param {DataItem|ObservableItem} item DataItemまたはObservableItem
	 * @param {String} prop プロパティ名
	 * @param {Any} value 値
	 */
	function setValue(item, prop, value) {
		item._values[prop] = value;
	}

	/**
	 * 渡されたタイプ指定文字が配列かどうかを返します
	 *
	 * @private
	 * @param {String} typeStr タイプ指定文字列
	 * @returns {Boolean} タイプ指定文字列が配列指定かどうか
	 */
	function isTypeArray(typeStr) {
		if (!typeStr) {
			return false;
		}
		return typeStr.indexOf('[]') !== -1;
	}

	/**
	 * validateDescriptor, validateDescriptor/Schema/DefaultValueが返すエラー情報の配列に格納するエラーオブジェクトを作成する
	 *
	 * @private
	 * @param {Integer} code エラーコード
	 * @param {Array} msgParam メッセージパラメータ
	 * @param {Boolean} stopOnError
	 * @returns {Object} エラーオブジェクト
	 */
	function createItemDescErrorReason(/* var args */) {
		var args = arguments;
		var code = args[0];
		// メッセージがない(min版)ならメッセージを格納しない
		if (!h5internal.core.data.DESCRIPTOR_VALIDATION_ERROR_MSGS) {
			return {
				code: code
			};
		}
		/* del begin */
		args[0] = DESCRIPTOR_VALIDATION_ERROR_MSGS[code];
		var msg = h5.u.str.format.apply(null, args);
		return {
			code: code,
			message: msg
		};
		/* del end */
	}

	/**
	 * 依存プロパティの再計算を行います。再計算後の値はitemの各依存プロパティに代入されます。
	 *
	 * @param {DataModel} model データモデル
	 * @param {DataItem} item データアイテム
	 * @param {Object} event プロパティ変更イベント
	 * @param {String|String[]} changedProps 今回変更されたプロパティ
	 * @param {Boolean} isCreate create時に呼ばれたものかどうか。createなら値の変更を見ずに無条件でcalcを実行する
	 * @returns {Object} { dependProp1: { oldValue, newValue }, ... } という構造のオブジェクト
	 */
	function calcDependencies(model, item, event, changedProps, isCreate) {
		// 今回の変更に依存する、未計算のプロパティ
		var targets = [];

		var dependsMap = model._dependencyMap;

		/**
		 * この依存プロパティが計算可能（依存するすべてのプロパティの再計算が完了している）かどうかを返します。
		 * 依存しているプロパティが依存プロパティでない場合は常にtrue(計算済み)を返します
		 * 依存しているプロパティが依存プロパティが今回の変更されたプロパティに依存していないならtrue(計算済み)を返します
		 */
		function isReady(dependProp) {
			var deps = wrapInArray(model.schema[dependProp].depend.on);
			for ( var i = 0, len = deps.length; i < len; i++) {
				if ($.inArray(deps[i], model._realProperty) === -1
						&& $.inArray(deps[i], targets) !== -1) {
					// 依存先が実プロパティでなく、未計算のプロパティであればfalseを返す
					return false;
				}
			}
			return true;
		}

		/**
		 * changedPropsで指定されたプロパティに依存するプロパティをtargetArrayに追加する
		 */
		function addDependencies(targetArray, srcProps) {
			for ( var i = 0, len = srcProps.length; i < len; i++) {
				var depends = dependsMap[srcProps[i]];

				if (!depends) {
					continue;
				}

				for ( var j = 0, jlen = depends.length; j < jlen; j++) {
					var dprop = depends[j];
					if ($.inArray(dprop, targetArray) === -1) {
						targetArray.push(dprop);
					}
				}
			}
		}

		var ret = {};

		if (isCreate) {
			// createならすべての実プロパティに依存するプロパティを列挙する
			// create時にundefinedがセットされた場合、変更なしなのでchangedPropsに入らないが、calcは計算させる
			targets = model._dependProps.slice();
		} else {
			//今回変更された実プロパティに依存するプロパティを列挙
			addDependencies(targets, wrapInArray(changedProps));
		}

		while (targets.length !== 0) {
			var restTargets = [];

			//各依存プロパティについて、計算可能（依存するすべてのプロパティが計算済み）なら計算する
			for ( var i = 0, len = targets.length; i < len; i++) {
				var dp = targets[i];

				if (isReady(dp)) {
					var newValue = model.schema[dp].depend.calc.call(item, event);

					// 型変換を行わない厳密チェックで、戻り値をチェックする
					var errReason = model._itemValueCheckFuncs[dp](newValue, true);
					if (errReason.length !== 0) {
						// calcの返した値が型・制約違反ならエラー
						throwFwError(ERR_CODE_CALC_RETURNED_INVALID_VALUE, [dp, newValue]);
					}
					ret[dp] = {
						oldValue: getValue(item, dp),
						newValue: newValue
					};
					// calcの結果をセット
					if (model.schema[dp] && isTypeArray(model.schema[dp].type)) {
						//配列の場合は値のコピーを行う。ただし、コピー元がnullの場合があり得る(type:[]はnullable)
						//その場合は空配列をコピー

						// DataItemの場合はimte._nullProps, ObsItemの場合はitem._internal._nullPropsにnullかどうかを保持する
						// TODO 実装をObsItemとDataItemで統一する
						var internal = item._internal || item;
						if (newValue) {
							getValue(item, dp).copyFrom(newValue);
							// newValueがnullでないならregardAsNull()がtrueを返すようにする
							internal._nullProps[dp] = false;
						} else {
							getValue(item, dp).copyFrom([]);
							// newValueがnullまたはundefinedならregardAsNull()がtrueを返すようにする
							internal._nullProps[dp] = true;
						}
					} else {
						setValue(item, dp, newValue);
					}
				} else {
					restTargets.push(dp);
				}
			}

			//今回計算対象となったプロパティに（再帰的に）依存するプロパティをrestに追加
			//restTargetsは「今回計算できなかったプロパティ＋新たに依存関係が発見されたプロパティ」が含まれる
			addDependencies(restTargets, targets);

			targets = restTargets;
		}

		return ret;
	}
	//========================================================
	//
	// バリデーション関係コードここから
	//
	//========================================================
	/**
	 * schemaオブジェクトのtype指定の文字列を、パースした結果を返す。 正しくパースできなかった場合は空オブジェクトを返す。
	 *
	 * @private
	 * @param {String} type
	 * @returns {Object} typeをパースした結果オブジェクト。
	 *          elmType:タイプから配列部分を除いた文字列。dataModel:データモデル名。dimension:配列の深さ(配列指定でない場合は0)
	 */
	function getTypeObjFromString(type) {
		// マッチ結果から、データモデル指定の場合と配列の場合をチェックする
		// "string[]"のとき、matched = ["string[]", "string", undefined, "[]", "[]"]
		// "@DataModel"のとき、matched = ["@DataModel", "@DataModel", "DataModel", "", undefined]
		var matched = type.match(/^(string|number|integer|boolean|any|enum|@(.+?))((\[\]){0,1})$/);
		return matched ? {
			elmType: matched[1],
			dataModel: matched[2],
			dimension: matched[3] ? 1 : 0
		} : {};
	}

	/**
	 * dependの循環参照をチェックする関数 循環参照するならtrueを返す
	 *
	 * @private
	 * @param {String} prop map[prop]から辿って行って調べる。
	 * @param {Object} map 依存関係をマップしたオブジェクト。{prop1: ['prop2','prop3'], prop2: ['prop3']}
	 *            のような構造で依存関係を表したオブジェクト
	 * @returns {Boolean} 循環参照しているかどうか
	 */
	function checkDependCircularRef(prop, map) {
		return (function checkCircular(p, ancestors) {
			if (!map[p]) {
				return false;
			}
			for ( var i = 0, l = map[p].length; i < l; i++) {
				if ($.inArray(map[p][i], ancestors) > -1
						|| checkCircular(map[p][i], ancestors.concat([p]))) {
					return true;
				}
			}
			return false;
		})(prop, []);
	}

	/**
	 * 引数がNaNかどうか判定する。isNaNとは違い、例えば文字列はNaNではないのでfalseとする
	 *
	 * @private
	 * @param {Any} val 判定する値
	 * @returns {Boolean} 引数がNaNかどうか
	 */
	function isStrictNaN(val) {
		return typeof val === 'number' && isNaN(val);
	}

	/**
	 * 引数を2つ取り、両方ともisStrictNaNかどうか判定する
	 *
	 * @private
	 * @param {Any} val1 判定する値
	 * @param {Any} val2 判定する値
	 * @returns {Boolean} 引数が2つともNaNかどうか
	 */
	function isBothStrictNaN(val1, val2) {
		return isStrictNaN(val1) && isStrictNaN(val2);
	}

	/**
	 * type:'number' 指定のプロパティに代入できるかのチェック null,undefined,NaN,parseFloatしてNaNにならないもの
	 * に当てはまる引数についてtrueを返す
	 *
	 * @private
	 * @param {Any} val 判定する値
	 * @param {Boolean} isStrict 厳密に判定するかどうか。isStrict === trueなら型変換可能でも型が違えばfalseを返す
	 * @returns {Boolean} type:'number'指定のプロパティに代入可能か
	 */
	function isNumberValue(val, isStrict) {
		// nullまたはundefinedはtrue
		// NaNを直接入れた場合はtrue
		// new Number() で生成したオブジェクトはtrue
		// 文字列の場合は、[±(数字)(.数字)]で構成されている文字列ならOKにする
		// ※ parseFloatよりも厳しいチェックにしている。
		// "1.2", "+1.2", "1", ".2", "-.2" はOK。
		// "12.3px"、"12.3.4"、"123.", [12.3, 4] はいずれもparseFloatできるが、ここではNG。
		return val == null
				|| isStrictNaN(val)
				|| typeof val === 'number'
				|| (!isStrict && (val instanceof Number || !!((isString(val) || val instanceof String) && !!val
						.match(/^[+\-]{0,1}[0-9]*\.{0,1}[0-9]+$/))));
	}

	/**
	 * type:'integer' 指定のプロパティに代入できるかのチェック null,undefined,parseFloatとparsFloatの結果が同じもの(NaNは除く)
	 * に当てはまる引数についてtrueを返す
	 *
	 * @private
	 * @param {Any} val 判定する値
	 * @param {Boolean} isStrict 厳密に判定するかどうか。isStrict === trueなら型変換可能でも型が違えばfalseを返す
	 * @returns {Boolean} type:'integer'指定のプロパティに代入可能か
	 */
	function isIntegerValue(val, isStrict) {
		// parseIntとparseFloatの結果が同じかどうかで整数値かどうかの判定をする
		// typeofが'nubmer'または、new Number()で生成したオブジェクトで、parseFloatとparseIntの結果が同じならtrue
		// NaN, Infinity, -Infinityはfalseを返す(parseInt(Infinity)はNaNであるので、InfinityはIntじゃない扱いにする
		// 文字列の場合は、[±数字]で構成されている文字列ならOKにする
		// ※ parseIntよりも厳しいチェックにしている。"12px"、"12.3"、[12,3] はいずれもparseIntできるが、ここではNG。
		return val == null
				|| (typeof val === 'number' && parseInt(val) === val)
				|| (!isStrict && (val instanceof Number && parseInt(val) === parseFloat(val) || (typeof val === 'string' || val instanceof String)
						&& !!val.match(/^[+\-]{0,1}[0-9]+$/)));
	}

	/**
	 * ラッパークラスをunboxする 配列が渡されたら、配列の中身をunboxする
	 *
	 * @private
	 * @param v {Any}
	 * @returns unboxしたもの
	 */
	function unbox(v) {
		if ($.isArray(v)) {
			var ary = v.slice(0);
			for ( var i = 0, l = ary.length; i < l; i++) {
				// aryalueOfメソッドのあるオブジェクトならその値を入れる
				ary[i] = ary[i] && typeof ary[i] === 'object' ? ary[i] && ary[i].valueOf
						&& ary[i].valueOf() : ary[i];
			}
			return ary;
		}
		return v && typeof v === 'object' && v.valueOf ? v.valueOf() : v;
	}


	/**
	 * type:'string' 指定のプロパティに代入できるかのチェック
	 *
	 * @private
	 * @param {Any} val 判定する値
	 * @param {Boolean} isStrict 厳密に判定するかどうか。isStrict === trueなら型変換可能でも型が違えばfalseを返す
	 * @returns {Boolean} type:'string'指定のプロパティに代入可能か
	 */
	function isStringValue(val, isStrict) {
		return !!(val == null || isString(val) || (!isStrict && val instanceof String));
	}

	/**
	 * type:'boolean' 指定のプロパティに代入できるかのチェック
	 *
	 * @private
	 * @param {Any} val 判定する値
	 * @param {Boolean} isStrict 厳密に判定するかどうか。isStrict === trueなら型変換可能でも型が違えばfalseを返す
	 * @returns {Boolean} type:'boolean'指定のプロパティに代入可能か
	 */
	function isBooleanValue(val, isStrict) {
		return val == null || typeof val === 'boolean' || (!isStrict && val instanceof Boolean);
	}

	/**
	 * type:'enum' 指定のプロパティに代入できるかのチェック
	 *
	 * @private
	 * @param {Any} val 判定する値
	 * @param {Array} enumValue 列挙されている値の配列
	 * @returns {Boolean} type:'enum'指定のプロパティに代入可能か
	 */
	function isEnumValue(v, enumValue) {
		if (isStrictNaN(v)) {
			// NaN の時は、NaN===NaNにならない(inArrayでも判定できない)ので、enumValueの中身を見て判定する
			for ( var i = 0, l = enumValue.length; i < l; i++) {
				if (isStrictNaN(enumValue[i])) {
					return true;
				}
			}
			return false;
		}
		return v === null || $.inArray(v, enumValue) > -1;
	}

	/**
	 * schemaが正しいかどうか判定する。 h5.core.data及びh5.uで使用するため、ここに記述している。
	 *
	 * @private
	 * @param {Object} schema schemaオブジェクト
	 * @param {Object} manager DataManagerオブジェクト
	 * @param {Boolean} stopOnError エラーが発生した時に、即座にreturnするかどうか。(trueなら即座にreturn)
	 * @param {Boolean} isObsItemSchema
	 *            ObservableItemの作成に指定したスキーマかどうか。trueならidのチェックをせず、データモデル依存は指定不可。
	 * @returns {Array} エラー理由を格納した配列。エラーのない場合は空配列を返す。
	 */
	function validateSchema(schema, manager, stopOnError, isObsItemSchema) {
		//TODO stopOnErrorが常にtrueで呼ばれるような実装にするなら、try-catchで囲ってエラー時にエラー投げて、catch節でthrowFwErrorするような実装にする
		var errorReason = [];

		if (!isObsItemSchema) {
			// id指定されている属性が一つだけであることをチェック
			var hasId = false;
			for ( var p in schema) {
				if (schema[p] && schema[p].id === true) {
					if (hasId) {
						errorReason
								.push(createItemDescErrorReason(SCHEMA_ERR_DETAIL_DUPLICATED_ID));
						if (stopOnError) {
							return errorReason;
						}
					}
					hasId = true;
				}
			}
			if (!hasId) {
				errorReason.push(createItemDescErrorReason(SCHEMA_ERR_DETAIL_NO_ID));
				if (stopOnError) {
					return errorReason;
				}
			}
		}

		// 循環参照チェックのため、depend指定されているプロパティが出てきたら覚えておく
		// key: プロパティ名, value: そのプロパティのdepend.onをwrapInArrayしたもの
		var dependencyMap = {};

		// schemaのチェック
		for ( var schemaProp in schema) {
			// null(またはundefined)がプロパティオブジェクトに指定されていたら、空オブジェクトと同等に扱い、エラーにしない。
			var propObj = schema[schemaProp] == null ? {} : schema[schemaProp];
			var isId = !!propObj.id;

			// プロパティ名が適切なものかどうかチェック
			if (!isValidNamespaceIdentifier(schemaProp)) {
				errorReason.push(createItemDescErrorReason(SCHEMA_ERR_DETAIL_INVALID_PROPERTY_NAME,
						schemaProp));
				if (stopOnError) {
					return errorReason;
				}
			}

			// -- dependのチェック --
			// defaultValueが指定されていたらエラー
			// onに指定されているプロパティがschema内に存在すること
			var depend = propObj.depend;
			if (depend != null) {
				// id指定されているならエラー
				if (isId) {
					errorReason.push(createItemDescErrorReason(SCHEMA_ERR_DETAIL_ID_DEPEND,
							schemaProp));
					if (stopOnError) {
						return errorReason;
					}
				}

				// defaultValueが指定されているならエラー
				if (propObj.hasOwnProperty('defaultValue')) {
					errorReason.push(createItemDescErrorReason(
							SCHEMA_ERR_DETAIL_DEFAULTVALUE_DEPEND, schemaProp));
					if (stopOnError) {
						return errorReason;
					}
				}

				// dependが指定されているなら、onが指定されていること
				if (depend.on == null) {
					errorReason.push(createItemDescErrorReason(SCHEMA_ERR_DETAIL_DEPEND_ON,
							schemaProp));
					if (stopOnError) {
						return errorReason;
					}
				} else {
					var onArray = wrapInArray(depend.on);
					for ( var i = 0, l = onArray.length; i < l; i++) {
						if (!schema.hasOwnProperty(onArray[i])) {
							errorReason.push(createItemDescErrorReason(SCHEMA_ERR_DETAIL_DEPEND_ON,
									schemaProp));
							if (stopOnError) {
								return errorReason;
							}
							break;
						}
					}
				}

				// dependが指定されているなら、calcが指定されていること
				if (typeof depend.calc !== 'function') {
					errorReason.push(createItemDescErrorReason(SCHEMA_ERR_DETAIL_DEPEND_CALC,
							schemaProp));
					if (stopOnError) {
						return errorReason;
					}
				}

				// 後の循環参照チェックのため、depend.onを覚えておく
				dependencyMap[schemaProp] = wrapInArray(depend.on);
			}

			// -- typeのチェック --
			// typeに指定されている文字列は正しいか
			// defaultValueとの矛盾はないか
			// constraintにそのtypeで使えない指定がないか
			// enumの時は、enumValueが指定されているか
			var type = propObj.type;
			if (isId && type == null) {
				// id項目で、typeが指定されていない場合は、type:stringにする
				type = 'string';
			}
			var typeObj = {};
			if (type != null) {
				if (!isString(type)) {
					errorReason.push(createItemDescErrorReason(SCHEMA_ERR_DETAIL_INVALID_TYPE,
							schemaProp));
					if (stopOnError) {
						return errorReason;
					}
				} else {

					if (isId && type !== 'string' && type !== 'integer') {
						// id指定されているプロパティで、string,integer以外だった場合はエラー
						errorReason.push('id指定されたプロパティにtypeを指定することはできません');
					}

					// "string", "number[]", "@DataModel"... などの文字列をパースしてオブジェクトを生成する
					// 正しくパースできなかった場合は空オブジェクトが返ってくる
					typeObj = getTypeObjFromString(type);

					if (!typeObj.elmType) {
						// パースできない文字列が指定されていたらエラー
						errorReason.push(createItemDescErrorReason(SCHEMA_ERR_DETAIL_TYPE,
								schemaProp, type));
						if (stopOnError) {
							return errorReason;
						}
					} else {
						// データモデルの場合
						if (typeObj.dataModel) {
							if (isObsItemSchema) {
								// ObservableItemのスキーマにはデータモデルを指定できないのでエラー
								errorReason.push(createItemDescErrorReason(SCHEMA_ERR_DETAIL_TYPE,
										schemaProp, typeObj.dataModel));
								if (stopOnError) {
									return errorReason;
								}
							}
							if (!manager.models[typeObj.dataModel]) {
								errorReason.push(createItemDescErrorReason(
										SCHEMA_ERR_DETAIL_TYPE_DATAMODEL, schemaProp,
										typeObj.dataModel));
								if (stopOnError) {
									return errorReason;
								}
							}
						}

						// enumの場合
						if (typeObj.elmType === 'enum') {
							// enumValueが無ければエラー
							if (propObj.enumValue == null) {
								errorReason.push(createItemDescErrorReason(
										SCHEMA_ERR_DETAIL_TYPE_ENUM_NO_ENUMVALUE, schemaProp));
								if (stopOnError) {
									return errorReason;
								}
							}
						}
					}
				}
			}

			// constraintのチェック
			// プロパティのチェック
			// 値のチェック
			// タイプと矛盾していないかのチェック
			var constraintObj = propObj.constraint;
			if (constraintObj != null) {
				if (!$.isPlainObject(constraintObj)) {
					// constraintがオブジェクトではない場合
					errorReason.push(createItemDescErrorReason(
							SCHEMA_ERR_DETAIL_INVALID_CONSTRAINT, schemaProp));
					if (stopOnError) {
						return errorReason;
					}
				} else {
					for ( var p in constraintObj) {
						// constraintのプロパティの値とtype指定との整合チェック
						var val = constraintObj[p];
						if (val == null) {
							continue;
						}
						switch (p) {
						case 'notNull':
							if (val !== true && val !== false) {
								// notNullにtrueまたはfalse以外が指定されていたらエラー
								errorReason.push(createItemDescErrorReason(
										SCHEMA_ERR_DETAIL_INVALID_CONSTRAINT_NOTNULL_NOTEMPTY,
										schemaProp, p));
								if (stopOnError) {
									return errorReason;
								}
							} else if (isId && !val) {
								// id項目にnotNull:falseが指定されていたらエラー
								errorReason.push(createItemDescErrorReason(
										SCHEMA_ERR_DETAIL_CONSTRAINT_CONFLICT_ID, schemaProp, p,
										val));
								if (stopOnError) {
									return errorReason;
								}
							}
							break;
						case 'min':
						case 'max':
							switch (typeObj.elmType) {
							case 'integer':
								if (isString(val) || !isIntegerValue(val) || isStrictNaN(val)) {
									// 整数値以外、NaNが指定されていたらエラー
									errorReason.push(createItemDescErrorReason(
											SCHEMA_ERR_DETAIL_INVALID_CONSTRAINT_MIN_MAX,
											schemaProp, p));
									if (stopOnError) {
										return errorReason;
									}
								}
								break;
							case 'number':
								if (isString(val) || isString(val) || !isNumberValue(val)
										|| val === Infinity || val === -Infinity
										|| isStrictNaN(val)) {
									// 整数値以外、NaNが指定されていたらエラー
									errorReason.push(createItemDescErrorReason(
											SCHEMA_ERR_DETAIL_INVALID_CONSTRAINT_MIN_MAX,
											schemaProp, p));
									if (stopOnError) {
										return errorReason;
									}
								}
								break;
							default:
								// typeの指定とconstraintに不整合があったらエラー
								errorReason.push(createItemDescErrorReason(
										SCHEMA_ERR_DETAIL_TYPE_CONSTRAINT, schemaProp, p,
										typeObj.elmType));
								if (stopOnError) {
									return errorReason;
								}
							}
							break;
						case 'minLength':
						case 'maxLength':
							switch (typeObj.elmType) {
							case 'string':
								if (isString(val) || !isIntegerValue(val) || isStrictNaN(val)
										|| val < 0) {
									// typeの指定とconstraintに不整合があったらエラー
									errorReason
											.push(createItemDescErrorReason(
													SCHEMA_ERR_DETAIL_INVALID_CONSTRAINT_MINLENGTH_MAXLENGTH,
													schemaProp, p));
									if (stopOnError) {
										return errorReason;
									}
								} else if (isId && p === 'maxLength' && val === 0) {
									// id項目にmaxLength: 0 が指定されていたらエラー
									errorReason.push(createItemDescErrorReason(
											SCHEMA_ERR_DETAIL_CONSTRAINT_CONFLICT_ID, schemaProp,
											p, val));
									if (stopOnError) {
										return errorReason;
									}
								}
								break;
							default:
								// type:'string'以外の項目にmaxLength,minLengthが指定されていればエラー
								errorReason.push(createItemDescErrorReason(
										SCHEMA_ERR_DETAIL_TYPE_CONSTRAINT, schemaProp, p,
										typeObj.elmType));
								if (stopOnError) {
									return errorReason;
								}
							}
							break;
						case 'notEmpty':
							switch (typeObj.elmType) {
							case 'string':
								if (val !== true && val !== false) {
									// notEmptyにtrue,false以外の指定がされていたらエラー
									errorReason.push(createItemDescErrorReason(
											SCHEMA_ERR_DETAIL_INVALID_CONSTRAINT_NOTNULL_NOTEMPTY,
											schemaProp, p));
									if (stopOnError) {
										return errorReason;
									}
								} else if (isId && !val) {
									// id項目にnotEmpty: false が指定されていたらエラー
									errorReason.push(createItemDescErrorReason(
											SCHEMA_ERR_DETAIL_CONSTRAINT_CONFLICT_ID, schemaProp,
											p, val));
									if (stopOnError) {
										return errorReason;
									}
								}
								break;
							default:
								// type:'string'以外の項目にnotEmptyが指定されていたらエラー
								errorReason.push(createItemDescErrorReason(
										SCHEMA_ERR_DETAIL_TYPE_CONSTRAINT, schemaProp, p,
										typeObj.elmType));
								if (stopOnError) {
									return errorReason;
								}
							}
							break;
						case 'pattern':
							switch (typeObj.elmType) {
							case 'string':
								if ($.type(val) !== 'regexp') {
									// patternにRegExpオブジェクト以外のものが指定されていたらエラー
									errorReason.push(createItemDescErrorReason(
											SCHEMA_ERR_DETAIL_INVALID_CONSTRAINT_PATTERN,
											schemaProp, p));
									if (stopOnError) {
										return errorReason;
									}
								}
								break;
							default:
								// type:'string'以外の項目にpatterが指定されていたらエラー
								errorReason.push(createItemDescErrorReason(
										SCHEMA_ERR_DETAIL_TYPE_CONSTRAINT, schemaProp, p,
										typeObj.elmType));
								if (stopOnError) {
									return errorReason;
								}
							}
							break;
						}
					}

					// constraintの中身に矛盾がないかどうかチェック
					if (constraintObj.notEmpty && constraintObj.maxLength === 0) {
						// notNullなのにmanLengthが0
						errorReason.push(createItemDescErrorReason(
								SCHEMA_ERR_DETAIL_CONSTRAINT_CONFLICT, schemaProp, 'notEmpty',
								'maxLength'));
						if (stopOnError) {
							return errorReason;
						}
					}
					if (constraintObj.min != null && constraintObj.max != null
							&& constraintObj.min > constraintObj.max) {
						// min > max
						errorReason.push(createItemDescErrorReason(
								SCHEMA_ERR_DETAIL_CONSTRAINT_CONFLICT, schemaProp, 'min', 'max'));
						if (stopOnError) {
							return errorReason;
						}
					}
					if (constraintObj.minLength != null && constraintObj.maxLength != null
							&& constraintObj.minLength > constraintObj.maxLength) {
						// minLength > maxLength
						errorReason.push(createItemDescErrorReason(
								SCHEMA_ERR_DETAIL_CONSTRAINT_CONFLICT, schemaProp, 'minLength',
								'maxLength'));
						if (stopOnError) {
							return errorReason;
						}
					}
				}
			}

			// enumValueのチェック
			var enumValue = propObj.enumValue;
			if (enumValue != null) {
				if (typeObj.elmType !== 'enum') {
					// type指定がenumでないならエラー
					errorReason.push(createItemDescErrorReason(SCHEMA_ERR_DETAIL_ENUMVALUE_TYPE,
							schemaProp));
					if (stopOnError) {
						return errorReason;
					}
				}
				if (!$.isArray(enumValue) || enumValue.length === 0
						|| $.inArray(null, enumValue) > -1 || $.inArray(undefined, enumValue) > -1) {
					// 配列でない、または空配列、null,undefinedを含む配列ならエラー
					errorReason.push(createItemDescErrorReason(SCHEMA_ERR_DETAIL_INVALID_ENUMVALUE,
							schemaProp));
					if (stopOnError) {
						return errorReason;
					}
				}
			}

			// defaultValueのチェック
			// defaultValueがtypeやconstraintの条件を満たしているかのチェックはここでは行わない
			// id:trueの項目にdefaultValueが指定されていればここでエラーにする
			// depend指定されている項目にdefaultValueが指定されている場合はエラー(dependのチェック時にエラーにしている)
			if (isId && propObj.hasOwnProperty('defaultValue')) {
				// id項目にdefaultValueが設定されていたらエラー
				errorReason.push(createItemDescErrorReason(SCHEMA_ERR_DETAIL_DEFAULTVALUE_ID,
						schemaProp));
				if (stopOnError) {
					return errorReason;
				}
			}
		}

		// depend.onの循環参照チェック
		// onに指定されているプロパティの定義が正しいかどうかのチェックが終わっているここでチェックする
		// （循環参照チェック以前の、プロパティがあるのか、dependがあるならonがあるか、などのチェックをしなくて済むようにするため）
		// （これ以前のチェックに引っかかっていたら、循環参照のチェックはしない）
		for ( var prop in dependencyMap) {
			if (checkDependCircularRef(prop, dependencyMap)) {
				errorReason
						.push(createItemDescErrorReason(SCHEMA_ERR_DETAIL_DEPEND_CIRCULAR_REF, p));
				if (stopOnError) {
					return errorReason;
				}
			}
		}
		return errorReason;
	}

	/**
	 * checkFuncsの条件をdefaultValueが満たすかどうかチェックする
	 *
	 * @private
	 * @param {Object} descriptor descriptor
	 * @param {Object} checkFuncs 各プロパティをキーに、チェックする関数を持つオブジェクト
	 * @param {Boolean} stopOnError defaultValueがチェック関数を満たさない時に、エラーを投げてチェックを中断するかどうか
	 * @returns {Array} エラー情報を格納した配列。エラーのない場合は中身のない配列を返す
	 */
	function validateDefaultValue(schema, checkFuncs, stopOnError) {
		var errorReason = [];
		for ( var p in schema) {
			var propObj = schema[p];
			if (!propObj || !propObj.hasOwnProperty('defaultValue') && propObj.type
					&& (propObj.type === 'array' || getTypeObjFromString(propObj.type).dimension)) {
				// defaultValueが指定されていないかつ、type指定が配列指定であれば、
				// 初期値は空のOvservableArrayになる。
				// 空のOvservableArrayがチェックに引っかかることはないので、チェック関数でチェックしない。
				continue;
			}

			// defaultValueが指定されていない場合は、ここではチェックしない
			if (!propObj.hasOwnProperty('defaultValue')) {
				continue;
			}
			var defaultValue = propObj.defaultValue;
			if (checkFuncs[p](defaultValue).length) {
				errorReason.push(createItemDescErrorReason(
						SCHEMA_ERR_DETAIL_INVALIDATE_DEFAULTVALUE, p, defaultValue));
				if (stopOnError) {
					return errorReason;
				}
			}
		}
		return errorReason;
	}

	/**
	 * スキーマのプロパティオブジェクトから、そのプロパティに入る値かどうかをチェックする関数を作る。 # schema:{val:xxxx,val2:....}
	 * のxxxxの部分と、マネージャを引数にとる スキーマのチェックが通ってから呼ばれる前提なので、エラーチェックは行わない。
	 *
	 * @private
	 * @param {object} propertyObject スキーマのプロパティオブジェクト
	 * @param {object} [manager] そのスキーマを持つモデルが属するマネージャのインスタンス。データモデルのチェックに必要(要らないなら省略可能)
	 * @returns {function} 指定されたスキーマのプロパティに、引数の値が入るかどうかをチェックする関数
	 */
	function createCheckValueBySchemaPropertyObj(propertyObject, manager) {
		// schema{prop:null} のように指定されている場合はpropObjはnullなので、空オブジェクト指定と同等に扱うようにする
		var propObj = propertyObject || {};
		var checkFuncArray = [];
		var elmType = null;
		var dimension = 0;
		var type = propObj.type;
		var constraint = propObj.constraint;

		// id:true の場合 type指定がない場合はtype:string,
		// notNull(type:stringならnotEmpty)をtrueにする
		if (propObj.id) {
			type = type || 'string';
			constraint = constraint || {};
			constraint.notNull = true;
			if (type === 'string') {
				constraint.notEmpty = true;
			}
		}
		if (type) {
			// typeに指定された文字列をパースしてオブジェクトに変換
			var typeObj = getTypeObjFromString(type);


			elmType = typeObj.elmType;
			// 配列の次元(0か1のみ)。配列でないなら0
			dimension = typeObj.dimension;

			// type指定を元に値を(配列は考慮せずに)チェックする関数を作成してcheckFuncArrayに追加
			checkFuncArray.push(createTypeCheckFunction(elmType, {
				manager: manager,
				enumValue: propObj.enumValue
			}));
		}
		// constraintを値が満たすかどうかチェックする関数を作成してcheckFuncArrayに追加
		if (propObj.constraint) {
			checkFuncArray.push(createConstraintCheckFunction(propObj.constraint));
		}
		return createCheckValueByCheckObj({
			checkFuncs: checkFuncArray,
			dimension: dimension
		});
	}

	/**
	 * descriptorからschemaの各プロパティの値をチェックする関数を作成して返す
	 *
	 * @private
	 * @param {Object} descriptor descriptor
	 * @param {Object} manager データモデルマネージャ
	 */
	function createCheckValueByDescriptor(schema, manager) {
		var checkFuncs = {};
		for ( var p in schema) {
			checkFuncs[p] = createCheckValueBySchemaPropertyObj(schema[p], manager);
		}
		return checkFuncs;
	}

	/**
	 * constraintオブジェクトから、値がそのconstraintの条件を満たすかどうか判定する関数を作成する
	 *
	 * @private
	 * @param {object} constraint constraintオブジェクト
	 * @returns {function} 値がconstraintを満たすかどうかチェックする関数。正しい場合は空配列、そうじゃない場合は引っかかった項目を返す
	 */
	function createConstraintCheckFunction(constraint) {
		return function(v) {
			var errObjs = [];
			if (constraint.notNull && v == null) {
				errObjs.push({
					notNull: constraint.notNull
				});
			}
			if (constraint.notEmpty && !v) {
				errObjs.push({
					notEmpty: constraint.notEmpty
				});
			}
			if (v == null) {
				// notNull,notEmptyのチェック以外は、nullでないものについてチェックを行うので、nullならtrueを返す
				return errObjs;
			}
			if (constraint.min != null && v < constraint.min) {
				errObjs.push({
					min: constraint.min
				});
			}
			if (constraint.max != null && constraint.max < v) {
				errObjs.push({
					max: constraint.max
				});
			}
			if (constraint.minLength != null && v.length < constraint.minLength) {
				errObjs.push({
					minLength: constraint.minLength
				});
			}
			if (constraint.maxLength != null && constraint.maxLength < v.length) {
				errObjs.push({
					maxLength: constraint.maxLength
				});
			}
			if (constraint.pattern != null && !v.match(constraint.pattern)) {
				errObjs.push({
					pattern: constraint.pattern
				});
			}
			return errObjs;
		};
	}

	/**
	 * type指定された文字列(から"[]"を除いた文字列)、引数がそのtypeを満たすかどうか判定する関数を作成する
	 *
	 * @private
	 * @param {string} elmType type指定文字列
	 * @param {object} [opt] type判定に使用するためのオプション
	 * @param {object} [opt.manager]
	 *            DataManagerオブジェクト。"@DataModel"のようにデータモデルを指定された場合、managerからデータモデルを探す
	 * @param {array} [opt.enumValue] typeが"enum"の場合、enumValueに入っているかどうかで判定する
	 * @returns {function} 引数がそのtypeを満たすかどうか判定する関数。満たすなら空配列、満たさないならエラーオブジェクトの入った配列を返す。
	 */
	function createTypeCheckFunction(elmType, opt) {
		var errObjs = [{
			type: elmType
		}];
		switch (elmType) {
		case 'number':
			return function(v, isStrict) {
				if (isNumberValue(v, isStrict)) {
					return [];
				}
				return errObjs;
			};
		case 'integer':
			return function(v, isStrict) {
				if (isIntegerValue(v, isStrict)) {
					return [];
				}
				return errObjs;
			};
		case 'string':
			return function(v, isStrict) {
				if (isStringValue(v, isStrict)) {
					return [];
				}
				return errObjs;
			};
		case 'boolean':
			return function(v, isStrict) {
				if (isBooleanValue(v, isStrict)) {
					return [];
				}
				return errObjs;
			};
		case 'enum':
			return function(v) {
				if (isEnumValue(v, opt.enumValue)) {
					return [];
				}
				return errObjs;
			};
		case 'any':
			// anyならタイプチェックは行わない
			return function() {
				return [];
			};
		}
		// タイプチェックは終わっているはずなので、どのケースにも引っかからない場合はデータモデルかつ、そのデータモデルはマネージャに存在する
		var matched = elmType.match(/^@(.+?)$/);
		var dataModelName = matched[1];
		var manager = opt.manager;
		return function(v) {
			var dataModel = manager.models[dataModelName];
			if (!dataModel) {
				// チェック時点でモデルがマネージャからドロップされている場合はfalse
				return errObjs;
			}
			if (typeof v !== 'object' && v != null) {
				// オブジェクト(またはnull,undefined)でないならfalse
				return errObjs;
			}
			// チェック時にそのモデルが持ってるアイテムかどうかで判定する
			// nullはOK
			if (v == null || dataModel.has(v)) {
				return [];
			}
			return errObjs;
		};
	}

	/**
	 * チェック関数と、配列の次元を持つオブジェクトを引数にとり、値のチェックを行う関数を作成して返す
	 *
	 * @private
	 * @param {object} checkObj
	 * @param {array} [checkObj.checkFuncs] チェックする関数の配列。配列の先頭の関数から順番にチェックする。指定のない場合は、return
	 *            true;するだけの関数を作成して返す
	 * @param {integer} [checkObj.dimension]
	 *            チェックする値の配列の次元。配列のdimension次元目が全てcheckFuncsを満たすことと、dimension-1次元目まではすべて配列であることを確認する関数を作成して返す。
	 *            0、または指定無しの場合は配列でないことを表す
	 * @returns {Function} 値をチェックする関数を返す。戻り値の関数はエラー理由を返す。length;0ならエラーでない。
	 */
	function createCheckValueByCheckObj(checkObj) {
		var funcs = checkObj.checkFuncs;
		if (!funcs || funcs.length === 0) {
			return function() {
				return [];
			};
		}
		var dim = checkObj.dimension || 0;
		/**
		 * 値のチェックを行う関数
		 *
		 * @param {Any} val 値
		 * @param {Boolean} isStrict 型変換可能ならOKにするかどうか
		 */
		return function checkValue(val, isStrict) {
			var errorReason = [];
			function _checkValue(v, d) {
				if (!d) {
					// チェック関数を順番に適用して、falseが返ってきたらチェック終了してfalseを返す
					for ( var i = 0, l = funcs.length; i < l; i++) {
						var result = funcs[i](v, isStrict);
						if (result.length) {
							errorReason = errorReason.concat(result);
							return false;
						}
					}
					return true;
				}
				// 配列指定なのにセットする値が配列でない場合はfalseを返す
				// ただしnullなら空配列同等の扱いをするので、チェックで弾かない
				if (v == null) {
					return true;
				}
				if (!$.isArray(v) && !h5.core.data.isObservableArray(v)) {
					errorReason.push({
						dimension: dim
					});
					return false;
				}
				for ( var i = 0, l = v.length; i < l; i++) {
					// 配列の各要素について、次元を一つ減らして再帰的にチェックする
					if (!_checkValue(v[i], d - 1)) {
						return false;
					}
				}
				// 全ての要素についてチェックが通ればtrue
				return true;
			}
			_checkValue(val, dim);
			return errorReason;
		};
	}

	/**
	 * schemaからdepend項目の依存関係を表すマップを作成する
	 *
	 * @private
	 * @param schema
	 * @returns {Object}
	 */
	function createDependencyMap(schema) {
		//{ 依存元: [依存先] }という構造のマップ。依存先プロパティは配列内で重複はしない。
		var dependencyMap = {};

		for ( var prop in schema) {
			if (schema.hasOwnProperty(prop)) {
				var dependency = schema[prop] ? schema[prop].depend : null;
				if (dependency) {
					var dependOn = wrapInArray(dependency.on);
					for ( var i = 0, len = dependOn.length; i < len; i++) {
						var dependSrcPropName = dependOn[i];

						if (!dependencyMap[dependSrcPropName]) {
							dependencyMap[dependSrcPropName] = [];
						}
						if ($.inArray(prop, dependencyMap[dependSrcPropName]) === -1) {
							dependencyMap[dependSrcPropName].push(prop);
						}
					}
				}
			}
		}

		return dependencyMap;
	}

	// =========================================================================
	//
	// Body
	//
	// =========================================================================



	//-------------------------------------------
	// イベントディスパッチャのコードここから
	//-------------------------------------------
	/**
	 * イベントディスパッチャ
	 * <p>
	 * イベントリスナを管理するクラスです。このクラスはnewできません。
	 * </p>
	 * <p>
	 * 以下のクラスがイベントディスパッチャのメソッドを持ちます。
	 * <ul>
	 * <li><a href="ObservableArray.html">ObservableArray</a>
	 * <li><a href="ObservableItem.html">ObservableItem</a>
	 * <li><a href="DataModelManager.html">DataModelManager</a>
	 * <li><a href="DataModel.html">DataModel</a>
	 * <li><a href="DataItem.html">DataItem</a>
	 * </ul>
	 * </p>
	 *
	 * @since 1.1.0
	 * @class
	 * @name EventDispatcher
	 */
	function EventDispatcher() {}

	/**
	 * イベントリスナが登録されているかどうかを返します
	 * <p>
	 * 第一引数にイベント名、第二引数にイベントリスナを渡し、指定したイベントに指定したイベントリスナが登録済みかどうかを返します。
	 * </p>
	 *
	 * @since 1.1.0
	 * @memberOf EventDispatcher
	 * @param {String} type イベント名
	 * @param {Function} listener イベントリスナ
	 * @returns {Boolean} 第一引数のイベント名に第二引数のイベントリスナが登録されているかどうか
	 */
	EventDispatcher.prototype.hasEventListener = function(type, listener) {
		if (!this.__listeners) {
			return false;
		}
		var l = this.__listeners[type];
		if (!l || !this.__listeners.hasOwnProperty(type)) {
			return false;
		}

		for ( var i = 0, count = l.length; i < count; i++) {
			if (l[i] === listener) {
				return true;
			}
		}
		return false;

	};

	/**
	 * イベントリスナを登録します。
	 * <p>
	 * 第一引数にイベント名、第二引数にイベントリスナを渡し、イベントリスナを登録します。指定したイベントが起こった時にイベントリスナが実行されます。
	 * </p>
	 * <p>
	 * 指定したイベントに、指定したイベントリスナが既に登録されていた場合は何もしません。
	 * </p>
	 * <p>
	 * 同一のイベントに対して複数回addEventListener()を呼び、複数のイベントリスナを登録した場合は、イベント発火時に登録した順番に実行されます。
	 * </p>
	 *
	 * @since 1.1.0
	 * @memberOf EventDispatcher
	 * @param {String} type イベント名
	 * @param {Function} listener イベントリスナ
	 */
	EventDispatcher.prototype.addEventListener = function(type, listener) {
		// 引数チェック
		if (arguments.length !== 2 || !isString(type) || !$.isFunction(listener)) {
			throwFwError(ERR_CODE_INVALID_ARGS_ADDEVENTLISTENER);
		}
		if (this.hasEventListener(type, listener)) {
			return;
		}

		if (!this.__listeners) {
			this.__listeners = {};
		}

		if (!(this.__listeners.hasOwnProperty(type))) {
			this.__listeners[type] = [];
		}

		this.__listeners[type].push(listener);
	};

	/**
	 * イベントリスナを削除します。
	 * <p>
	 * 第一引数にイベント名、第二引数にイベントリスナを渡し、指定したイベントから指定したイベントリスナを削除します。
	 * </p>
	 * <p>
	 * 指定したイベント名に指定したイベントリスナが登録されていない場合は何もしません。
	 * </p>
	 *
	 * @since 1.1.0
	 * @memberOf EventDispatcher
	 * @param {String} type イベント名
	 * @param {Function} listener イベントリスナ
	 */
	EventDispatcher.prototype.removeEventListener = function(type, listener) {
		if (!this.hasEventListener(type, listener)) {
			return;
		}

		var l = this.__listeners[type];

		for ( var i = 0, count = l.length; i < count; i++) {
			if (l[i] === listener) {
				l.splice(i, 1);
				return;
			}
		}
	};

	/**
	 * イベントをディスパッチします
	 * <p>
	 * イベントオブジェクトを引数に取り、そのevent.typeに登録されているイベントリスナを実行します。
	 * イベントオブジェクトにpreventDefault()関数を追加してイベントリスナの引数に渡して呼び出します。
	 * </p>
	 * <p>
	 * 戻り値は『イベントリスナ内でpreventDefault()が呼ばれたかどうか』を返します。
	 * </p>
	 *
	 * @since 1.1.0
	 * @memberOf EventDispatcher
	 * @param {Object} event イベントオブジェクト
	 * @returns {Boolean} イベントリスナ内でpreventDefault()が呼ばれたかどうか。
	 */
	EventDispatcher.prototype.dispatchEvent = function(event) {
		if (!this.__listeners) {
			return;
		}
		var l = this.__listeners[event.type];
		if (!l) {
			return;
		}

		if (!event.target) {
			event.target = this;
		}

		var isDefaultPrevented = false;

		event.preventDefault = function() {
			isDefaultPrevented = true;
		};

		for ( var i = 0, count = l.length; i < count; i++) {
			l[i].call(event.target, event);
		}

		return isDefaultPrevented;
	};
	//--------------------------------------------
	// イベントディスパッチャのコードここまで
	//--------------------------------------------

	/**
	 * ObservableArray(オブザーバブルアレイ)とは、通常の配列と同じAPIを持ち操作を外部から監視できる、配列とほぼ同じように利用可能なクラスです。
	 * DOM要素のようにaddEventListenerでリスナーをセットすることで、配列に対するメソッド呼び出しをフックすることができます。
	 * <p>
	 * <a href="h5.core.data.html#createObservableArray">h5.core.data.createObservableArray()</a>で作成します。
	 * </p>
	 * <p>
	 * 通常の配列と同様の操作に加え、要素の追加、削除、変更についての監視ができます。
	 * </p>
	 * <p>
	 * Arrayクラスの持つメソッド(concat, join, pop, push, reverse, shift, slice, sort, splice, unshift,
	 * indexOf, lastIndexOf, every, filter, forEach, map, some, reduce, reduceRight)が使えます。
	 * </p>
	 * <p>
	 * このクラスは<a href="EventDispatcher.html">EventDispatcherクラス</a>のメソッドを持ちます。イベント関連のメソッドについては<a
	 * href="EventDispatcher.html">EventDispatcherクラス</a>を参照してください。<br>
	 * ObservableArrayは、自身の内容が変更されるメソッドが呼び出される時、実行前に'changeBefore'、実行後に'change'イベントを発生させます。
	 * </p>
	 *
	 * @since 1.1.0
	 * @class
	 * @extends EventDispatcher
	 * @name ObservableArray
	 */
	function ObservableArray() {
		/**
		 * 配列の長さを表します。このプロパティは読み取り専用で使用してください。
		 *
		 * @since 1.1.0
		 * @memberOf ObservableArray
		 * @type Number
		 */
		this.length = 0;

		this._src = [];
	}
	$.extend(ObservableArray.prototype, EventDispatcher.prototype);

	//ObservableArrayの関数はフックされるので、直接prototypeに置かない
	var obsFuncs = {
		/**
		 * この配列が、引数で指定された配列と同じ内容か比較します。<br>
		 * 要素にNaN定数が入っている場合、同一位置にともにNaNが入っているかどうかをisNaN()関数でチェックします。
		 * （obsArrayの内容が[NaN]のとき、obsArray.equals([NaN])）はtrueになります。）
		 *
		 * @since 1.1.0
		 * @memberOf ObservableArray
		 * @param {ObservableArray|Array} ary ObservableArrayまたはArray型の配列
		 * @returns {Boolean} 判定結果
		 */
		equals: function(ary) {
			var len = this.length;

			// aryが配列でもObservableArrayでもないならfalse
			//サイズが異なる場合もfalse
			if (!($.isArray(ary) || isObservableArray(ary)) || ary.length !== len) {
				return false;
			}

			var target = isObservableArray(ary) ? ary._src : ary;

			// 中身の比較
			for ( var i = 0; i < len; i++) {
				var myVal = this[i];
				var targetVal = target[i];

				if (!(myVal === targetVal || isBothStrictNaN(myVal, targetVal))) {
					return false;
				}
			}
			return true;
		},

		/**
		 * 指定された配列の要素をこのObservableArrayにシャローコピーします。
		 * <p>
		 * 元々入っていた値は全て削除され、呼び出し後は引数で指定された配列と同じ要素を持ちます。
		 * </p>
		 * 引数がnullまたはundefinedの場合は、空配列が渡された場合と同じ挙動をします（自身の要素が全て削除されます）。
		 *
		 * @since 1.1.0
		 * @memberOf ObservableArray
		 * @param {Array} src コピー元の配列
		 */
		copyFrom: function(src) {
			if (!src) {
				//srcがnullの場合は空配列と同じ挙動にする
				src = [];
			}

			src = isObservableArray(src) ? src._src : src;

			if (!$.isArray(src)) {
				//引数が配列でない場合はエラー
				throwFwError(ERR_CODE_INVALID_ARGUMENT, [0, src]);
			}

			var args = src.slice(0);
			args.unshift(0, this.length);
			Array.prototype.splice.apply(this, args);
		},

		/**
		 * 値を取得します。
		 *
		 * @since 1.1.3
		 * @memberOf ObservableArray
		 * @param {Number} index 取得する要素のインデックス
		 * @returns 要素の値
		 */
		get: function(index) {
			return this[index];
		},

		/**
		 * 値をセットします。
		 *
		 * @since 1.1.3
		 * @memberOf ObservableArray
		 * @param {Number} index 値をセットする要素のインデックス
		 */
		set: function(index, value) {
			this[index] = value;
		},

		/**
		 * 現在のObservableArrayインスタンスと同じ要素を持ったネイティブ配列インスタンスを返します。
		 *
		 * @since 1.1.3
		 * @memberOf ObservableArray
		 * @returns ネイティブ配列インスタンス
		 */
		toArray: function() {
			return this.slice(0);
		},

		/**
		 * 動作は通常の配列のconcatと同じです。<br>
		 * 引数にObservableArrayが渡された場合にそれを通常の配列とみなして動作するようラップされています。
		 *
		 * @since 1.1.3
		 * @memberOf ObservableArray
		 * @returns 要素を連結したObservableArrayインスタンス
		 */
		concat: function() {
			var args = h5.u.obj.argsToArray(arguments);
			for ( var i = 0, len = args.length; i < len; i++) {
				if (isObservableArray(args[i])) {
					args[i] = args[i].toArray();
				}
			}
			return this.concat.apply(this, args);
		}
	};

	//Array.prototypeのメンバーはfor-inで列挙されないためここで列挙。
	//プロパティアクセスのProxyingが可能になれば不要になるかもしれない。
	var arrayMethods = ['concat', 'join', 'pop', 'push', 'reverse', 'shift', 'slice', 'sort',
			'splice', 'unshift', 'indexOf', 'lastIndexOf', 'every', 'filter', 'forEach', 'map',
			'some', 'reduce', 'reduceRight'];
	for ( var obsFuncName in obsFuncs) {
		if (obsFuncs.hasOwnProperty(obsFuncName) && $.inArray(obsFuncName, arrayMethods) === -1) {
			arrayMethods.push(obsFuncName);
		}
	}

	// 戻り値として配列を返すので戻り値をラップする必要があるメソッド（従ってtoArrayは含めない）
	var creationMethods = ['concat', 'slice', 'splice', 'filter', 'map'];

	//戻り値として自分自身を返すメソッド
	var returnsSelfMethods = ['reverse', 'sort'];

	// 破壊的(副作用のある)メソッド
	var destructiveMethods = ['sort', 'reverse', 'pop', 'shift', 'unshift', 'push', 'splice',
			'copyFrom', 'set'];

	for ( var i = 0, len = arrayMethods.length; i < len; i++) {
		var arrayMethod = arrayMethods[i];
		ObservableArray.prototype[arrayMethod] = (function(method) {
			var func = obsFuncs[method] ? obsFuncs[method] : Array.prototype[method];

			function doProcess() {
				var ret = func.apply(this._src, arguments);

				if ($.inArray(method, returnsSelfMethods) !== -1) {
					//自分自身を返すメソッドの場合
					ret = this;
				} else if ($.inArray(method, creationMethods) !== -1) {
					//新しい配列を生成するメソッドの場合
					var wrapper = createObservableArray();
					wrapper.copyFrom(ret);
					ret = wrapper;
				}

				return ret;
			}

			if ($.inArray(method, destructiveMethods) === -1) {
				//非破壊メソッドの場合
				return doProcess;
			}

			//破壊メソッドの場合は、changeBefore/changeイベントを出す

			//TODO fallback実装の提供?(優先度低)
			return function() {
				var evBefore = {
					type: 'changeBefore',
					method: method,
					args: arguments
				};

				if (!this.dispatchEvent(evBefore)) {
					//preventDefault()が呼ばれなければ実際に処理を行う
					var ret = doProcess.apply(this, arguments);

					this.length = this._src.length;

					var evAfter = {
						type: 'change',
						method: method,
						args: arguments,
						returnValue: ret
					};
					this.dispatchEvent(evAfter);
					return ret;
				}
			};
		})(arrayMethod);
	}


	/**
	 * ObservableArrayを作成します。
	 *
	 * @since 1.1.0
	 * @memberOf h5.core.data
	 * @returns {ObservableArray} ObservableArrayインスタンス
	 */
	function createObservableArray() {
		return new ObservableArray();
	}

	/**
	 * ObservableArrayかどうかを判定します。
	 *
	 * @since 1.1.0
	 * @memberOf h5.core.data
	 * @returns {Boolean} ObservableArrayかどうか
	 */
	function isObservableArray(obj) {
		if (obj && obj.constructor === ObservableArray) {
			return true;
		}
		return false;
	}

	/**
	 * ObservableItem(オブザーバブルアアイテム)とは、プロパティ操作の監視可能なオブジェクトです。
	 * <p>
	 * <a href="h5.core.data.html#createObservableItem">h5.core.data.createObservableItem()</a>で作成します。
	 * </p>
	 * <p>
	 * <a href="DataItem.html">データアイテム</a>と同様、get/setで値の読み書きを行います。
	 * </p>
	 * <p>
	 * このクラスは<a href="EventDispatcher.html">EventDispatcherクラス</a>のメソッドを持ちます。イベント関連のメソッドについては<a
	 * href="EventDispatcher.html">EventDispatcherクラス</a>を参照してください。<br>
	 * ObservableItemは、アイテムが持つ値に変更があった場合に'change'イベントが発火します。
	 * </p>
	 *
	 * @since 1.1.0
	 * @extends EventDispatcher
	 * @class
	 * @name ObservableItem
	 */
	/**
	 * (コンストラクタは公開していないので、JSDocに@paramが載らないようにしています。)
	 *
	 * @since 1.1.0
	 * @private
	 * @param {Object} schema schemaオブジェクト。データモデルディスクリプタのスキーマと同様のスキーマオブジェクトを指定します。ただしidの指定は不要です。
	 * @param {Object} itemValueCheckFuncs データモデルのスキーマに適合するかどうかをチェックする関数。キーがプロパティ名で、値がチェック関数の配列
	 */
	function ObservableItem(schema, itemValueCheckFuncs) {
		// 実プロパティと依存プロパティ、配列プロパティを列挙
		var realProps = [];
		var dependProps = [];
		var aryProps = [];
		for ( var p in schema) {
			if (schema[p] && schema[p].depend) {
				dependProps.push(p);
			} else {
				realProps.push(p);
			}
			if (schema[p] && schema[p].type && schema[p].type.indexOf('[]') !== -1) {
				aryProps.push(p);
			}
		}

		/**
		 * 値チェックに必要な情報を持つオブジェクト
		 * <p>
		 * データアイテムではモデルに持たせていましたが、ObservableItemにモデルはないので、必要な情報を_internalプロパティに持ちます
		 * </p>
		 *
		 * @private
		 * @name _internal
		 * @since 1.1.0
		 * @memberOf ObservableItem
		 * @type Object
		 */
		this._internal = {

			/**
			 * スキーマオブジェクト
			 *
			 * @memberOf ObservableItem._internal
			 * @since 1.1.1
			 * @type Object
			 */
			schema: schema,

			/**
			 * プロパティの依存関係マップ
			 *
			 * @private
			 * @memberOf ObservableItem._internal
			 * @since 1.1.0
			 * @type Object
			 */
			_dependencyMap: createDependencyMap(schema),

			/**
			 * モデルが持つ依存プロパティ
			 *
			 * @private
			 * @since 1.1.0
			 * @type Array
			 */
			dependProps: dependProps,

			/**
			 * モデルが持つ実プロパティ(依存しないプロパティ)
			 *
			 * @private
			 * @since 1.1.0
			 * @type Array
			 * @memberOf DataModel
			 */
			realProps: realProps,

			/**
			 * ObservableArrayのプロパティ
			 *
			 * @private
			 * @since 1.1.0
			 * @type Array
			 */
			aryProps: aryProps,

			/**
			 * プロパティの型・制約チェック関数<br>
			 * プロパティ名をキー、値としてチェック関数を持つ
			 *
			 * @private
			 * @since 1.1.0
			 * @type Object
			 */
			_itemValueCheckFuncs: itemValueCheckFuncs,

			_nullProps: {}
		};

		/**
		 * 値を保持するオブジェクト
		 *
		 * @private
		 * @since 1.1.0
		 * @memberOf ObservableItem
		 * @type Object
		 */
		this._values = {};

		// 値に変更があったプロパティ(最初なので、全てのプロパティ)
		var changedProps = [];

		// イベントオブジェクト(最初なのでtype:'create', propsには全ての実プロパティ。
		var event = {
			props: {},
			target: this,
			type: 'create'
		};
		// this._valuesに値(defaultValue)のセット
		for ( var p in schema) {
			if ($.inArray(p, aryProps) !== -1) {
				this._values[p] = createObservableArray();
				this._internal._nullProps[p] = true;

				if (schema[p].hasOwnProperty('defaultValue')) {
					// null,undefなら空ObservableArrayにする
					if (schema[p].defaultValue != null) {
						this._values[p].copyFrom(schema[p].defaultValue);
						this._internal._nullProps[p] = false;
					}
				}

				if ($.inArray(p, realProps) !== -1) {
					// 実プロパティの場合はeventに格納
					changedProps.push(p);
					event.props[p] = {
						newValue: this._values[p],
						oldValue: undefined
					};
				}
				continue;
			}

			if ($.inArray(p, dependProps) !== -1) {
				// 依存プロパティでかつ配列でもないなら何もしない
				continue;
			}
			changedProps.push(p);

			if (schema[p] && schema[p].hasOwnProperty('defaultValue')) {
				var defVal = schema[p].defaultValue;
				this._values[p] = defVal;
				event.props[p] = {
					newValue: defVal,
					oldValue: undefined
				};

				continue;
			}

			// 実プロパティの初期値はnull, 依存プロパティの初期値はundefinedでevent.propsには入れない
			if ($.inArray(p, realProps) !== -1) {
				var defVal = null;
				this._values[p] = defVal;
				event.props[p] = {
					newValue: defVal,
					oldValue: undefined
				};
			} else {
				this._values[p] = undefined;
			}
		}

		// 依存項目の計算
		calcDependencies(this._internal, this, event, changedProps);

		//-----------------------------------------------------------------------
		// 配列プロパティについて、イベント管理用のリスナをaddEventListenerする
		//-----------------------------------------------------------------------

		// 破壊的メソッドだが、追加しないメソッド。validateする必要がない。
		var noAddMethods = ['sort', 'reverse', 'pop', 'shift'];

		var item = this;

		for ( var i = 0, l = aryProps.length; i < l; i++) {
			var p = aryProps[i];
			var obsAry = this._values[p];
			(function(propName, observableArray) {
				var oldValue; // プロパティのoldValue
				function changeBeforeListener(event) {
					// set内で呼ばれたcopyFromなら何もしない
					// (checkもevent上げもsetでやっているため)
					if (item._internal.isInSet) {
						return;
					}

					var args = h5.u.obj.argsToArray(event.args);

					// 破壊メソッドだけど要素を追加しないメソッド(削除やソート)
					// の場合はチェックはせずにoldValueの保存だけ行う

					if ($.inArray(event.method, noAddMethods) === -1) {
						var checkFlag = true;

						// チェックするメソッドは unshift, push, splice, copyFrom, set
						// そのうち、メソッドの引数をそのままチェックすればいいのはunshift, push
						switch (event.method) {
						case 'splice':
							if (args.length <= 2) {
								// spliceに引数が2つなら要素追加はないので、validateチェックはしない
								checkFlag = false;
							}
							checkFlag = false;
							// spliceの場合追加要素は第3引数以降のため2回shiftする
							args.shift();
							args.shift();
							break;

						case 'copyFrom':
							// copyFromの場合は引数が配列であるため、外側の配列を外す
							args = args[0];
							break;

						case 'set':
							// setの場合は第1引数はindexなので、shift()したものをチェックする
							args.shift();

						}

						if (checkFlag) {
							var validateResult = itemValueCheckFuncs[propName](args);
							if (validateResult.length > 0) {
								throwFwError(ERR_CODE_INVALID_ITEM_VALUE, propName, validateResult);
							}
						}
					}

					//oldValueを保存
					oldValue = item._values[propName].slice(0);
				}

				function changeListener(event) {
					// set内で呼ばれたcopyFromなら何もしない(item._internal.isInSetにフラグを立てている)
					if (item._internal.isInSet) {
						return;
					}

					// 配列の値が変化していないなら何もしない
					if (observableArray.equals(oldValue)) {
						return;
					}

					// changeイベントオブジェクトの作成
					var ev = {
						type: 'change',
						target: item,
						props: {
							oldValue: oldValue,
							newValue: observableArray
						}
					};

					// setにオブジェクトで渡されて、更新される場合があるので、isUpdateSessionとかで判断する必要がある
					item.dispatchEvent(ev);
				}
				observableArray.addEventListener('changeBefore', changeBeforeListener);
				observableArray.addEventListener('change', changeListener);
			})(p, obsAry);
		}
	}

	$.extend(ObservableItem.prototype, EventDispatcher.prototype, {
		/**
		 * 値をセットします。
		 * <p>
		 * <a href="DataItem.html#set">DataItem#set()</a>と同様に値をセットします。
		 * </p>
		 *
		 * @since 1.1.0
		 * @memberOf ObservableItem
		 * @param {Any} var_args 複数のキー・値のペアからなるオブジェクト、または1組の(キー, 値)を2つの引数で取ります。
		 */
		set: function(/* var_args */) {
			var setObj = {};
			if (arguments.length === 2) {
				setObj[arguments[0]] = arguments[1];
			} else {
				setObj = arguments[0];
			}

			// item._internal.isInSetフラグを立てて、set内の変更でObsAry.copyFromを呼んだ時にイベントが上がらないようにする
			this._internal.isInSet = true;
			var props = {};

			// 先に値のチェックを行う
			for ( var p in setObj) {
				if ($.inArray(p, this._internal.realProps) === -1) {
					if ($.inArray(p, this._internal.dependProps) !== -1) {
						// 依存プロパティにセットはできないのでエラー
						throwFwError(ERR_CODE_DEPEND_PROPERTY, p);
					}
					// スキーマに定義されていないプロパティにセットはできないのでエラー
					throwFwError(ERR_CODE_CANNOT_SET_NOT_DEFINED_PROPERTY, p);
				}
				var val = setObj[p];
				// type:[]のプロパティにnull,undefが指定されたら、空配列と同様に扱う
				if ($.inArray(p, this._internal.aryProps) !== -1) {
					if (val == null) {
						val = [];
						this._internal._nullProps[p] = true;
					} else {
						this._internal._nullProps[p] = false;
					}
				}
				//値のチェック
				var validateResult = this._internal._itemValueCheckFuncs[p](val);
				if (validateResult.length) {
					throwFwError(ERR_CODE_INVALID_ITEM_VALUE, p, validateResult);
				}
			}

			// 値に変更があればセット
			var changedProps = [];
			for ( var p in setObj) {
				var v = setObj[p];
				var oldValue = this._values[p];

				// 値に変更があったかどうかチェック
				if ($.inArray(p, this._internal.aryProps) !== -1) {
					if (this._values[p].equals(v)) {
						// 変更なし
						continue;
					}
					oldValue = oldValue.slice(0);
					this._values[p].copyFrom(v);
				} else {
					if (v === this._values[p] || isBothStrictNaN(v, this._values[p])) {
						// 変更なし
						continue;
					}
					this._values[p] = v;
				}

				props[p] = {
					oldValue: oldValue,
					newValue: this._values[p]
				};

				changedProps.push(p);
			}
			this._internal.isInSet = false;

			if (changedProps.length != 0) {
				// 変更があれば依存項目の計算とイベントの発火
				var event = {
					target: this,
					type: 'change',
					props: props
				};
				// 依存項目の計算
				calcDependencies(this._internal, this, event, changedProps);
				this.dispatchEvent(event);
			}
		},

		/**
		 * 値を取得します。
		 * <p>
		 * <a href="DataItem.html#get">DataItem#get()</a>と同様です。
		 * </p>
		 *
		 * @since 1.1.0
		 * @memberOf ObservableItem
		 * @param {String} [key] プロパティキー。指定のない場合は、アイテムの持つプロパティ名をキーに、そのプロパティの値を持つオブジェクトを返します。
		 * @returns {Any} 指定されたプロパティの値。引数なしの場合はプロパティキーと値を持つオブジェクト。
		 */
		get: function(key) {
			if (arguments.length === 0) {
				return $.extend({}, this._values);
			}

			if ($.inArray(key, this._internal.realProps) === -1
					&& $.inArray(key, this._internal.dependProps) === -1) {
				throwFwError(ERR_CODE_CANNOT_GET_NOT_DEFINED_PROPERTY, key);
			}

			return this._values[key];
		},

		/**
		 * type:[]であるプロパティについて、最後にセットされた値がnullかどうかを返します。<br>
		 * type:[]としたプロパティは常にObservableArrayインスタンスがセットされており、set('array', null);
		 * と呼ぶと空配列を渡した場合と同じになります。そのため、「実際にはnullをセットしていた（item.set('array',
		 * null)）」場合と「空配列をセットしていた（item.set('array,' [])）」場合を区別したい場合にこのメソッドを使ってください。<br>
		 * データアイテムを生成した直後は、スキーマにおいてdefaultValueを書いていないまたはnullをセットした場合はtrue、それ以外の場合はfalseを返します。<br>
		 * なお、引数に配列指定していないプロパティを渡した場合は、現在の値がnullかどうかを返します。
		 *
		 * @since 1.1.0
		 * @memberOf ObservableItem
		 * @returns {Boolean} 現在のこのプロパティにセットされているのがnullかどうか
		 */
		regardAsNull: function(key) {
			if (this._isArrayProp(key)) {
				return this._internal._nullProps[key] === true;
			}
			return this.get(key) === null;
		},

		/**
		 * 指定されたプロパティがtype:[]かどうかを返します。（type:anyでObservableArrayが入っている場合とtype:[]で最初から
		 * ObservableArrayが入っている場合を区別するため）
		 *
		 * @since 1.1.0
		 * @private
		 * @memberOf ObservableItem
		 * @returns {Boolean} 指定されたプロパティがtype:[]なプロパティかどうか
		 */
		_isArrayProp: function(prop) {
			if ($.inArray(prop, this._internal.aryProps) !== -1) {
				//Bindingにおいて比較的頻繁に使われるので、高速化も検討する
				return true;
			}
			return false;
		}
	});

	/**
	 * ObservableItemを作成します。
	 * <p>
	 * 引数にはスキーマオブジェクトを指定します。スキーマオブジェクトとは、ディスクリプタオブジェクトのschemaプロパティに指定するオブジェクトのことです。
	 * </p>
	 * <p>
	 * ディスクリプタオブジェクトについては<a
	 * href="/conts/web/view/tutorial-data-model/descriptor">チュートリアル(データモデル編)&gt;&gt;ディスクリプタの書き方</a>をご覧ください。
	 * </p>
	 *
	 * @since 1.1.0
	 * @memberOf h5.core.data
	 * @param {Object} schema スキーマオブジェクト
	 * @returns {ObservableItem} ObservableItemインスタンス
	 */
	function createObservableItem(schema) {
		if (typeof schema !== 'object') {
			// schemaがオブジェクトじゃないならエラー
			throwFwError(ERR_CODE_REQUIRE_SCHEMA);
		}

		var errorReason = validateSchema(schema, null, true, true);
		if (errorReason.length > 0) {
			// schemaのエラー
			throwFwError(ERR_CODE_INVALID_SCHEMA, null, errorReason);
		}

		var itemValueCheckFuncs = createCheckValueByDescriptor(schema);

		// defaultValueのチェック
		var defaultValueErrorReason = validateDefaultValue(schema, itemValueCheckFuncs, true);

		if (defaultValueErrorReason.length > 0) {
			// defaultValueのエラー
			throwFwError(ERR_CODE_INVALID_SCHEMA, null, defaultValueErrorReason);
		}

		return new ObservableItem(schema, itemValueCheckFuncs);
	}

	/**
	 * ObserevableItemかどうかを判定します。
	 *
	 * @since 1.1.0
	 * @memberOf h5.core.data
	 * @returns {Boolean} ObservableItemかどうか
	 */
	function isObservableItem(obj) {
		if (obj instanceof ObservableItem) {
			return true;
		}
		return false;
	}

	// =============================
	// Expose to window
	// =============================
	/**
	 * @namespace
	 * @name data
	 * @memberOf h5.core
	 */
	h5.u.obj.expose('h5.core.data', {
		createObservableArray: createObservableArray,
		createObservableItem: createObservableItem,
		isObservableArray: isObservableArray,
		isObservableItem: isObservableItem
	});

	// h5.core.dataでも共通で使用するエラーメッセージオブジェクトと、関数
	h5internal.core.data = {
		/* del begin */
		// dev版でのみエラーメッセージを使用する
		DESCRIPTOR_VALIDATION_ERROR_MSGS: DESCRIPTOR_VALIDATION_ERROR_MSGS,
		/* del end */
		validateSchema: validateSchema,
		validateDefaultValue: validateDefaultValue,
		createCheckValueByDescriptor: createCheckValueByDescriptor,
		createItemDescErrorReason: createItemDescErrorReason,
		createDependencyMap: createDependencyMap,
		isIntegerValue: isIntegerValue,
		isNumberValue: isNumberValue,
		isStringValue: isStringValue,
		isStrictNaN: isStrictNaN,
		isBothStrictNaN: isBothStrictNaN,
		unbox: unbox,
		EventDispatcher: EventDispatcher,
		calcDependencies: calcDependencies,
		getValue: getValue,
		setValue: setValue,
		isTypeArray: isTypeArray,
		ITEM_ERRORS: {
			ERR_CODE_INVALID_ITEM_VALUE: ERR_CODE_INVALID_ITEM_VALUE,
			ERR_CODE_DEPEND_PROPERTY: ERR_CODE_DEPEND_PROPERTY,
			ERR_CODE_CANNOT_GET_NOT_DEFINED_PROPERTY: ERR_CODE_CANNOT_GET_NOT_DEFINED_PROPERTY,
			ERR_CODE_CANNOT_SET_NOT_DEFINED_PROPERTY: ERR_CODE_CANNOT_SET_NOT_DEFINED_PROPERTY
		},
		ERR_CODE_INVALID_SCHEMA: ERR_CODE_INVALID_SCHEMA
	};
})();


/* ------ h5.core.data ------ */
(function() {
	// =========================================================================
	//
	// Constants
	//
	// =========================================================================

	//=============================
	// Production
	//=============================

	/**
	 * <a href="#createSequence">createSequence()</a>で使用するための、型指定定数。
	 * <p>
	 * 文字列型を表します。
	 * </p>
	 *
	 * @since 1.1.0
	 * @memberOf h5.core.data
	 * @type {Integer}
	 */
	var SEQ_STRING = 1;

	/**
	 * <a href="#createSequence">createSequence()</a>で使用するための、型指定定数
	 * <p>
	 * 数値型を表します。
	 * </p>
	 *
	 * @since 1.1.0
	 * @memberOf h5.core.data
	 * @type {Integer}
	 */
	var SEQ_INT = 2;

	var ID_TYPE_STRING = 'string';
	var ID_TYPE_INT = 'number';

	// エラーコード

	/** マネージャ名が不正 */
	var ERR_CODE_INVALID_MANAGER_NAME = 15000;

	/** ディスプリプタが不正 */
	var ERR_CODE_INVALID_DESCRIPTOR = 15001;

	/** データアイテムの生成にはIDが必要なのに指定されていない */
	var ERR_CODE_NO_ID = 15002;

	/** DataItem.set()でidをセットすることはできない */
	var ERR_CODE_CANNOT_SET_ID = 15003;

	/** createModelに渡された配列内のディスクリプタ同士でtypeやbaseによる依存関係が循環参照している */
	var ERR_CODE_DESCRIPTOR_CIRCULAR_REF = 15004;

	/** DataModelに属していないDataItem、またはDataManagerに属していないDataModelのDataItemは変更できない */
	var ERR_CODE_CANNOT_CHANGE_REMOVED_ITEM = 15005;

	/** DataManagerに属していないDataModelで、create/remove/変更できない */
	var ERR_CODE_CANNOT_CHANGE_DROPPED_MODEL = 15006;

	/** createの引数がオブジェクトでも配列でもない */
	var ERR_CODE_INVALID_CREATE_ARGS = 15007;

	// ---------------------------
	//ディスクリプタのエラーコード
	// ---------------------------

	// ObservableItemと共通のものは0番台なので、1000番台で登録する
	// この番号自体は外に公開しているものではないので、ObserevableItemのメッセージIDと被らなければよい
	/**
	 * ディスクリプタがオブジェクトでない
	 */
	var DESC_ERR_DETAIL_NOT_OBJECT = 15900;

	/**
	 * nameが正しく設定されていない
	 */
	var DESC_ERR_DETAIL_INVALID_NAME = 15901;

	/**
	 * baseの指定が不正
	 */
	var DESC_ERR_DETAIL_INVALID_BASE = 15902;

	/**
	 * baseに指定されたデータモデルが存在しない
	 */
	var DESC_ERR_DETAIL_NO_EXIST_BASE = 15903;

	/**
	 * schemaもbaseも指定されていない
	 */
	var DESC_ERR_DETAIL_NO_SCHEMA = 15904;

	/**
	 * schemaがオブジェクトでない
	 */
	var DESCRIPTOR_SCHEMA_ERR_CODE_NOT_OBJECT = 6;

	var EVENT_ITEMS_CHANGE = 'itemsChange';

	var UPDATE_LOG_TYPE_CREATE = 1;
	var UPDATE_LOG_TYPE_CHANGE = 2;
	var UPDATE_LOG_TYPE_REMOVE = 3;



	//=============================
	// Development Only
	//=============================

	var fwLogger = h5.log.createLogger('h5.core.data');

	/* del begin */

	function formatDescriptorError(code, msgSrc, msgParam, detail) {
		var msg = h5.u.str.format.apply(null, [msgSrc].concat(msgParam)) + ' 詳細：';

		for ( var i = 0, len = detail.length; i < len; i++) {
			if (i !== 0) {
				msg += ', ';
			}

			msg += (i + 1) + ':';

			var reason = detail[i];
			if (reason.message) {
				msg += reason.message;
			} else {
				msg += 'code=' + reason.code;
			}
		}

		return msg;
	}
	addFwErrorCustomFormatter(ERR_CODE_INVALID_DESCRIPTOR, formatDescriptorError);
	addFwErrorCustomFormatter(h5internal.core.data.ERR_CODE_INVALID_SCHEMA, formatDescriptorError);

	// ログメッセージ
	var MSG_ERROR_DUP_REGISTER = '同じ名前のデータモデルを登録しようとしました。同名のデータモデルの2度目以降の登録は無視されます。マネージャ名は {0}, 登録しようとしたデータモデル名は {1} です。';

	var ERROR_MESSAGES = {};
	ERROR_MESSAGES[ERR_CODE_INVALID_MANAGER_NAME] = 'マネージャ名が不正です。識別子として有効な文字列を指定してください。';
	ERROR_MESSAGES[ERR_CODE_NO_ID] = 'id:trueを指定しているプロパティがありません。データアイテムの生成にはid:trueを指定した項目が必須です。';
	ERROR_MESSAGES[ERR_CODE_INVALID_DESCRIPTOR] = 'データモデルディスクリプタにエラーがあります。';
	ERROR_MESSAGES[ERR_CODE_CANNOT_SET_ID] = 'id指定されたプロパティを変更することはできません。';
	ERROR_MESSAGES[ERR_CODE_DESCRIPTOR_CIRCULAR_REF] = 'Datamaneger.createModelに渡された配列内のディスクリプタについて、baseやtypeによる依存関係が循環参照しています。';
	ERROR_MESSAGES[ERR_CODE_CANNOT_CHANGE_REMOVED_ITEM] = 'DataModelに属していないDataItem、またはDataManagerに属していないDataModelのDataItemの中身は変更できません。データアイテムID={0}, メソッド={1}';
	ERROR_MESSAGES[ERR_CODE_CANNOT_CHANGE_DROPPED_MODEL] = 'DataManagerに属していないDataModelの中身は変更できません。モデル名={0}, メソッド={1}';
	ERROR_MESSAGES[ERR_CODE_INVALID_CREATE_ARGS] = 'DataModel.createに渡された引数が不正です。オブジェクトまたは、配列を指定してください。';

	addFwErrorCodeMap(ERROR_MESSAGES);

	/**
	 * detailに格納する ディスクリプタのエラーメッセージ
	 */
	// h5.core.data_observablesと共通のものを使う
	var DESCRIPTOR_VALIDATION_ERROR_MSGS = h5internal.core.data.DESCRIPTOR_VALIDATION_ERROR_MSGS;
	DESCRIPTOR_VALIDATION_ERROR_MSGS[DESC_ERR_DETAIL_NOT_OBJECT] = 'DataModelのディスクリプタにはオブジェクトを指定してください。';
	DESCRIPTOR_VALIDATION_ERROR_MSGS[DESC_ERR_DETAIL_INVALID_NAME] = 'データモデル名が不正です。使用できる文字は、半角英数字、_、$、のみで、先頭は数字以外である必要があります。';
	DESCRIPTOR_VALIDATION_ERROR_MSGS[DESC_ERR_DETAIL_INVALID_BASE] = 'baseの指定が不正です。指定する場合は、継承したいデータモデル名の先頭に"@"を付けた文字列を指定してください。';
	DESCRIPTOR_VALIDATION_ERROR_MSGS[DESC_ERR_DETAIL_NO_EXIST_BASE] = 'baseの指定が不正です。指定されたデータモデル{0}は存在しません。';
	DESCRIPTOR_VALIDATION_ERROR_MSGS[DESC_ERR_DETAIL_NO_SCHEMA] = 'schemaの指定が不正です。baseの指定がない場合はschemaの指定は必須です。';
	DESCRIPTOR_VALIDATION_ERROR_MSGS[DESCRIPTOR_SCHEMA_ERR_CODE_NOT_OBJECT] = 'schemaの指定が不正です。schemaはオブジェクトで指定してください。';
	/* del end */


	// =========================================================================
	//
	// Cache
	//
	// =========================================================================
	var argsToArray = h5.u.obj.argsToArray;

	// h5internal.core.dataのものを変数にキャッシュする
	var validateSchema = h5internal.core.data.validateSchema;
	var validateDefaultValue = h5internal.core.data.validateDefaultValue;
	var createCheckValueByDescriptor = h5internal.core.data.createCheckValueByDescriptor;
	var createItemDescErrorReason = h5internal.core.data.createItemDescErrorReason;
	var createDependencyMap = h5internal.core.data.createDependencyMap;
	var isIntegerValue = h5internal.core.data.isIntegerValue;
	var isNumberValue = h5internal.core.data.isNumberValue;
	var unbox = h5internal.core.data.unbox;
	var EventDispatcher = h5internal.core.data.EventDispatcher;
	var calcDependencies = h5internal.core.data.calcDependencies;
	var getValue = h5internal.core.data.getValue;
	var setValue = h5internal.core.data.setValue;
	var isTypeArray = h5internal.core.data.isTypeArray;
	var isBothStrictNaN = h5internal.core.data.isBothStrictNaN;

	// DataItemと共通のエラーコード
	var ITEM_ERRORS = h5internal.core.data.ITEM_ERRORS;

	// =========================================================================
	//
	// Privates
	//
	// =========================================================================
	//=============================
	// Variables
	//=============================
	//=============================
	// Functions
	//=============================
	function createDataModelItemsChangeEvent(created, recreated, removed, changed) {
		return {
			type: EVENT_ITEMS_CHANGE,
			created: created,
			recreated: recreated,
			removed: removed,
			changed: changed
		};
	}

	//========================================================
	//
	// バリデーション関係コードここから
	//
	//========================================================

	/**
	 * データモデルのディスクリプタとして正しいオブジェクトかどうかチェックする。 schema以外をチェックしたあと、validateSchemaを呼び出して結果をマージして返す。
	 *
	 * @private
	 * @param {Object} descriptor オブジェクト
	 * @param {Object} DataManagerオブジェクト
	 * @param {Boolean} stopOnErro エラーが発生した時に、即座にreturnするかどうか
	 * @returns {Array} schemaのチェック結果。validateSchemaの戻り値をそのまま返す
	 */
	function validateDescriptor(descriptor, manager, stopOnError) {
		var errorReason = [];
		// descriptorがオブジェクトかどうか
		if (!$.isPlainObject(descriptor)) {
			// descriptorがオブジェクトじゃなかったら、これ以上チェックしようがないので、stopOnErrorの値に関わらずreturnする
			errorReason.push(createItemDescErrorReason(DESC_ERR_DETAIL_NOT_OBJECT));
			return errorReason;
		}

		// nameのチェック
		if (!isValidNamespaceIdentifier(descriptor.name)) {
			// 識別子として不適切な文字列が指定されていたらエラー
			errorReason.push(createItemDescErrorReason(DESC_ERR_DETAIL_INVALID_NAME));
			if (stopOnError) {
				return errorReason;
			}
		}

		// baseのチェック
		var base = descriptor.base;
		var baseSchema = null;
		if (base != null) {
			// nullまたはundefinedならチェックしない
			if (!isString(base) || base.indexOf('@') !== 0) {
				// @で始まる文字列（base.indexOf('@')が0）でないならエラー
				errorReason.push(createItemDescErrorReason(DESC_ERR_DETAIL_INVALID_BASE));
				if (stopOnError) {
					return errorReason;
				}
			} else {
				var baseName = base.substring(1);
				var baseModel = manager.models[baseName];
				if (!baseModel) {
					// 指定されたモデルが存在しないならエラー
					errorReason.push(createItemDescErrorReason(DESC_ERR_DETAIL_NO_EXIST_BASE,
							baseName));
					if (stopOnError) {
						return errorReason;
					}
				} else {
					baseSchema = manager.models[baseName].schema;
				}
			}
		}

		// schemaのチェック
		// baseSchemaがないのに、schemaが指定されていなかったらエラー
		var schema = descriptor.schema;
		if (!baseSchema && schema == null) {
			errorReason.push(createItemDescErrorReason(DESC_ERR_DETAIL_NO_SCHEMA));
			if (stopOnError) {
				return errorReason;
			}
		}

		// schemaが指定されていて、オブジェクトでないならエラー
		if (!baseSchema && !$.isPlainObject(schema)) {
			errorReason.push(createItemDescErrorReason(DESCRIPTOR_SCHEMA_ERR_CODE_NOT_OBJECT));
			// schemaがオブジェクトでなかったら、schemaのチェックのしようがないので、stopOnErrorの値に関わらずreturnする
			return errorReason;
		}

		// base指定されていた場合は、後勝ちでextendする
		schema = $.extend(baseSchema, schema);

		// errorReasonにschemaのチェック結果を追加して返す
		return errorReason.concat(validateSchema(schema, manager, stopOnError));
	}

	//========================================================
	//
	// バリデーション関係コードここまで
	//
	//========================================================

	function itemSetter(model, item, valueObj, noValidationProps, ignoreProps, isCreate) {
		// valueObjから整合性チェックに通ったものを整形して格納する配列
		var readyProps = [];

		//先に、すべてのプロパティの整合性チェックを行う
		for ( var prop in valueObj) {
			if (!(prop in model.schema)) {
				// schemaに定義されていないプロパティ名が入っていたらエラー
				throwFwError(ITEM_ERRORS.ERR_CODE_CANNOT_SET_NOT_DEFINED_PROPERTY, [model.name,
						prop]);
			}
			if (ignoreProps && ($.inArray(prop, ignoreProps) !== -1)) {
				//このpropプロパティは無視する
				continue;
			}

			var oldValue = getValue(item, prop);
			var newValue = valueObj[prop];

			// depend指定されている項目はset禁止
			if (model.schema[prop] && model.schema[prop].depend) {
				if (oldValue === newValue) {
					//dependなプロパティの場合、現在の値とこれから代入しようとしている値が
					//厳密等価でtrueになる場合に限り、代入をエラーにせず無視する。
					//これは、item.get()の戻り値のオブジェクトをそのままset()しようとしたときに
					//dependのせいでエラーにならないようにするため。
					continue;
				}
				throwFwError(ITEM_ERRORS.ERR_CODE_DEPEND_PROPERTY, prop);
			}

			var type = model.schema[prop] && model.schema[prop].type;

			// 配列でかつnewValueがnullまたはundefinedなら、空配列が渡された時と同様に扱う。
			// エラーにせず、保持しているObsAryインスタンスを空にする。
			if (isTypeArray(type)) {
				if (newValue == null) {
					newValue = [];
					item._nullProps[prop] = true;
				} else {
					item._nullProps[prop] = false;
				}
			}

			// typeがstring,number,integer,boolean、またはその配列なら、値がラッパークラスの場合にunboxする
			if (type && type.match(/string|number|integer|boolean/)) {
				newValue = unbox(newValue);
			}

			//このプロパティをバリデーションしなくてよいと明示されているならバリデーションを行わない
			if ($.inArray(prop, noValidationProps) === -1) {
				//型・制約チェック
				//配列が渡された場合、その配列の要素が制約を満たすかをチェックしている
				var validateResult = model._validateItemValue(prop, newValue);
				if (validateResult.length > 0) {
					throwFwError(ITEM_ERRORS.ERR_CODE_INVALID_ITEM_VALUE, prop, validateResult);
				}
			}

			//値がnull以外なら中身の型変換行う
			//typeがnumber,integerで、newValueが文字列(もしくは配列)なら型変換を行う
			//型のチェックは終わっているので、typeがnumber・integerならnewValueは数値・数値変換可能文字列・null またはそれらを要素に持つ配列のいずれかである
			if (newValue != null && type && type.match(/number|integer/)
					&& typeof newValue !== 'number') {
				if ($.isArray(newValue) || h5.core.data.isObservableArray(newValue)) {
					for ( var i = 0, l = newValue.length; i < l; i++) {
						// スパースな配列の場合、undefinedが入っている可能性があるので、!= で比較
						// parseFloatできる値(isNumberValueに渡してtrueになる値)ならparseFloatする
						if (newValue[i] != null && isNumberValue(newValue[i])) {
							newValue[i] = parseFloat(newValue[i]);
						}
					}
				} else if (newValue != null) {
					newValue = parseFloat(newValue);
				}
			}

			// 配列なら、配列の中身も変更されていないかチェックする(type:anyならチェックしない)
			// type:[]の場合、oldValueは必ずObsArrayまたはundefined。
			// newValue,oldValueともに配列(oldValueの場合はObsArray)かつ、長さが同じ場合にのみチェックする
			if (isTypeArray(type) && oldValue && oldValue.equals(newValue, oldValue)) {
				continue;
			}

			// 値の型変更を行った後に、値が変更されていないかチェックする
			if (oldValue === newValue) {
				//同じ値がセットされた場合は何もしない
				continue;
			}

			// ObservableArrayの場合、oldValueはスナップしたただの配列にする
			// ただし、typeが未指定またはanyにObservableArrayが入っていた場合はそのまま
			if (type && type.indexOf('[]') !== -1 && h5.core.data.isObservableArray(oldValue)) {
				//TODO sliceを何度もしないようにする
				oldValue = oldValue.slice(0);
			}

			//ここでpushしたプロパティのみ、後段で値をセットする
			readyProps.push({
				p: prop,
				o: oldValue,
				n: newValue
			});
		}
		//更新する値のない場合は何も返さないで終了
		if (!readyProps.length) {
			return;
		}

		var changedProps = {};
		var changedPropNameArray = [];

		//値の変更が起こる全てのプロパティについて整合性チェックが通ったら、実際に値を代入する
		for ( var i = 0, len = readyProps.length; i < len; i++) {
			var readyProp = readyProps[i];

			//TODO 判定文改良
			if (model.schema[readyProp.p] && isTypeArray(model.schema[readyProp.p].type)) {
				//配列の場合は値のコピーを行う。ただし、コピー元がnullの場合があり得る（create()でdefaultValueがnull）ので
				//その場合はコピーしない
				if (readyProp.n) {
					getValue(item, readyProp.p).copyFrom(readyProp.n);
				}
			} else {
				//新しい値を代入
				setValue(item, readyProp.p, readyProp.n);
			}

			//newValueは現在Itemが保持している値（type:[]の場合は常に同じObsArrayインスタンス）
			changedProps[readyProp.p] = {
				oldValue: readyProp.o,
				newValue: item.get(readyProp.p)
			};

			changedPropNameArray.push(readyProp.p);
		}

		//最初にアイテムを生成した時だけ、depend.calcに渡すイベントのtypeはcreateにする
		var eventType = isCreate === true ? 'create' : 'change';

		//今回変更されたプロパティと依存プロパティを含めてイベント送出
		var event = {
			type: eventType,
			target: item,
			props: changedProps
		};

		//依存プロパティを再計算する
		var changedDependProps = calcDependencies(model, item, event, changedPropNameArray,
				isCreate);

		//依存プロパティの変更をchangeイベントに含める
		$.extend(changedProps, changedDependProps);

		return event;
	}

	/**
	 * propで指定されたプロパティのプロパティソースを作成します。
	 *
	 * @private
	 */
	function createDataItemConstructor(model, descriptor) {
		//model.schemaは継承関係を展開した後のスキーマ
		var schema = model.schema;

		function setObservableArrayListeners(model, item, propName, observableArray) {
			//TODO 現状だとインスタンスごとにfunctionを作っているが、
			//DataItem&&property名ごとに作るようにして数を減らしたい(DataItemのprototypeとして持たせればよい？)

			// 配列操作前と操作後で使う共通の変数
			// 配列操作が同期のため、必ずchangeBeforeListener→配列操作→changeListenerになるので、ここのクロージャ変数を両関数で共通して使用できる

			// アップデートセッション中かどうか
			var isAlreadyInUpdate = false;

			// 破壊的メソッドだが、追加しないメソッド。validateする必要がない。
			var noAddMethods = ['sort', 'reverse', 'pop', 'shift'];

			function changeBeforeListener(event) {
				// itemがmodelに属していない又は、itemが属しているmodelがmanagerに属していないならエラー
				if (item._model !== model || !model._manager) {
					throwFwError(ERR_CODE_CANNOT_CHANGE_REMOVED_ITEM, [item._values[model.idKey],
							event.method]);
				}

				var args = argsToArray(event.args);
				if ($.inArray(event.method, noAddMethods) === -1) {
					var isValidateRequired = true;

					// チェックするメソッドは unshift, push, splice, copyFrom, set
					// そのうち、メソッドの引数をそのままチェックすればいいのはunshift, push
					switch (event.method) {
					case 'splice':
						if (args.length <= 2) {
							// spliceに引数が2つなら要素追加はないので、validateチェックはしない
							isValidateRequired = false;
						}
						isValidateRequired = false;
						// spliceの場合追加要素は第3引数以降のため2回shiftする
						args.shift();
						args.shift();
						break;

					case 'copyFrom':
						// copyFromの場合は引数が配列であるため、外側の配列を外す
						args = args[0];
						break;

					case 'set':
						// setの場合は第1引数はindexなので、shift()したものをチェックする
						args.shift();

					}

					if (isValidateRequired) {
						var validateResult = model._validateItemValue(propName, args);
						if (validateResult.length > 0) {
							throwFwError(ITEM_ERRORS.ERR_CODE_INVALID_ITEM_VALUE, propName,
									validateResult);
						}
					}
				}
				// oldValueが登録されていなければ登録
				addObsArrayOldValue(model, item, propName);

				// 配列操作前にbeginUpdateして、配列操作後にendUpdateする
				isAlreadyInUpdate = model._manager ? model._manager.isInUpdate() : false;
				if (!isAlreadyInUpdate) {
					model._manager.beginUpdate();
				}
			}

			function changeListener(event) {
				// 配列の要素が全て同じかどうかのチェックはendUpdateのなかでやる

				// changeイベントオブジェクトの作成
				var ev = {
					type: 'change',
					target: item,
					props: {}
				};

				// newValueは現在の値、oldValueはmanager._oldValueLogsの中なので、ここでpropsを入れる必要ない
				ev.props[propName] = {};

				addUpdateChangeLog(model, ev);
				// アップデートセッション中じゃなければendUpdate()
				if (!isAlreadyInUpdate) {
					model._manager.endUpdate();
				}
			}

			observableArray.addEventListener('changeBefore', changeBeforeListener);
			observableArray.addEventListener('change', changeListener);
		}

		/**
		 * データアイテムクラス
		 * <p>
		 * データアイテムは<a href="DataModel.html#create">DataModel#create()</a>で作成します。
		 * </p>
		 * <p>
		 * このクラスは<a href="EventDispatcher.html">EventDispatcherクラス</a>のメソッドを持ちます。イベント関連のメソッドについては<a
		 * href="EventDispatcher.html">EventDispatcherクラス</a>を参照してください。<br>
		 * データアイテムは、アイテムが持つ値に変更があった場合に'change'イベントが発火します。
		 * </p>
		 *
		 * @since 1.1.0
		 * @class
		 * @extends EventDispatcher
		 * @name DataItem
		 * @param {Object} userInitialValue ユーザー指定の初期値
		 */
		function DataItem(userInitialValue) {
			/**
			 * データアイテムが属しているデータモデル
			 *
			 * @private
			 * @since 1.1.0
			 * @memberOf DataItem
			 */
			this._model = model;

			// このアイテムが持つ値を格納するオブジェクト
			this._values = {};

			/** type:[]なプロパティで、最後にset()された値がnullかどうかを格納する。キー：プロパティ名、値：true/false */
			this._nullProps = {};

			var actualInitialValue = {};

			var noValidationProps = [];

			//TODO モデルに持たせる
			var arrayProps = [];

			// userInitialValueの中に、schemaで定義されていないプロパティへの値のセットが含まれていたらエラー
			for ( var p in userInitialValue) {
				if (!schema.hasOwnProperty(p)) {
					throwFwError(ITEM_ERRORS.ERR_CODE_CANNOT_SET_NOT_DEFINED_PROPERTY, [model.name,
							p]);
				}
			}

			//デフォルト値を代入する
			for ( var plainProp in schema) {
				var propDesc = schema[plainProp];

				if (propDesc && isTypeArray(propDesc.type)) {
					//配列の場合は最初にObservableArrayのインスタンスを入れる
					var obsArray = h5.core.data.createObservableArray(); //TODO cache
					//DataItemに属するObsArrayには、Item自身への参照を入れておく。
					//これによりイベントハンドラ内でこのItemを参照することができる
					obsArray.relatedItem = this;
					setValue(this, plainProp, obsArray);
					this._nullProps[plainProp] = true;
					arrayProps.push(plainProp);
				}

				if (propDesc && propDesc.depend) {
					//依存プロパティにはデフォルト値はない（最後にrefresh()で計算される）
					if (plainProp in userInitialValue) {
						// 依存プロパティが与えられていた場合はエラー
						throwFwError(ITEM_ERRORS.ERR_CODE_DEPEND_PROPERTY, plainProp);
					}
					continue;
				}

				var initValue = null;

				if (plainProp in userInitialValue) {
					//create時に初期値が与えられていた場合

					// depend指定プロパティにはdefaultValueを指定できないが、validateSchemaでチェック済みなので
					// ここでチェックは行わない

					// 与えられた初期値を代入
					initValue = userInitialValue[plainProp];
				} else if (propDesc && propDesc.defaultValue !== undefined) {
					//DescriptorのdefaultValueがあれば代入
					initValue = propDesc.defaultValue;

					//TODO else節と共通化
					if (propDesc && isTypeArray(propDesc.type)) {
						//type:[]の場合、、defaultValueは事前に制約チェック済みなので改めてvalidationしなくてよい
						noValidationProps.push(plainProp);
					}
				} else {
					//どちらでもない場合はnull
					//ただし、notNull制約などがついている場合はセッターで例外が発生する
					initValue = null;

					if (propDesc && isTypeArray(propDesc.type)) {
						//type:[]で、userInitValueもdefaultValueも与えられなかった場合はvalidationを行わない
						noValidationProps.push(plainProp);
					}
				}

				actualInitialValue[plainProp] = initValue;
			}

			itemSetter(model, this, actualInitialValue, noValidationProps, null, true);

			for ( var i = 0, l = arrayProps.length; i < l; i++) {
				setObservableArrayListeners(model, this, arrayProps[i], this.get(arrayProps[i]));
			}
		}
		$.extend(DataItem.prototype, EventDispatcher.prototype, {
			/**
			 * 指定されたキーのプロパティの値を取得します。
			 * <p>
			 * 引数にプロパティ名を指定すると、アイテムが持つそのプロパティの値を返します。
			 * </p>
			 * <p>
			 * 引数の指定がない場合は、{id: '001', value: 'hoge'} のような、そのデータアイテムが持つ値を格納したオブジェクトを返します。
			 * </p>
			 *
			 * @since 1.1.0
			 * @memberOf DataItem
			 * @param {String} [key] プロパティキー。指定のない場合は、アイテムの持つプロパティ名をキーに、そのプロパティの値を持つオブジェクトを返します。
			 * @returns Any 指定されたプロパティの値。引数なしの場合はプロパティキーと値を持つオブジェクト。
			 */
			get: function(key) {
				if (arguments.length === 0) {
					return $.extend({}, this._values);
				}

				if (!schema.hasOwnProperty(key)) {
					//スキーマに存在しないプロパティはgetできない（プログラムのミスがすぐわかるように例外を送出）
					throwFwError(ITEM_ERRORS.ERR_CODE_CANNOT_GET_NOT_DEFINED_PROPERTY, [model.name,
							key]);
				}

				return getValue(this, key);
			},

			/**
			 * 指定されたキーのプロパティに値をセットします。
			 * <p>
			 * 複数のプロパティに対して値を一度にセットしたい場合は、{ キー1: 値1, キー2: 値2, ... }という構造をもつオブジェクトを1つだけ渡してください。
			 * </p>
			 * <p>
			 * 1つのプロパティに対して値をセットする場合は、 item.set(key, value); のように2つの引数でキーと値を個別に渡すこともできます。
			 * </p>
			 * <p>
			 * このメソッドを呼ぶと、再計算が必要と判断された依存プロパティは自動的に再計算されます。
			 * 再計算によるパフォーマンス劣化を最小限にするには、1つのアイテムへのset()の呼び出しはできるだけ少なくする
			 * （引数をオブジェクト形式にして一度に複数のプロパティをセットし、呼び出し回数を最小限にする）ようにしてください。
			 * </p>
			 *
			 * @since 1.1.0
			 * @memberOf DataItem
			 * @param {Any} var_args 複数のキー・値のペアからなるオブジェクト、または1組の(キー, 値)を2つの引数で取ります。
			 */
			set: function(var_args) {
				var idKey = model.idKey;

				// アイテムがモデルに属していない又は、アイテムが属しているモデルがマネージャに属していないならエラー
				if (this._model !== model || !this._model._manager) {
					throwFwError(ERR_CODE_CANNOT_CHANGE_REMOVED_ITEM,
							[getValue(this, idKey), 'set'], this);
				}
				//引数はオブジェクト1つ、または(key, value)で呼び出せる
				var valueObj = var_args;
				if (arguments.length === 2) {
					valueObj = {};
					valueObj[arguments[0]] = arguments[1];
				}

				if ((idKey in valueObj) && (valueObj[idKey] !== getValue(this, idKey))) {
					//IDの変更は禁止
					throwFwError(ERR_CODE_CANNOT_SET_ID, null, this);
				}

				// updateセッション中かどうか。updateセッション中ならこのsetの中ではbeginUpdateもendUpdateしない
				// updateセッション中でなければ、begin-endで囲って、最後にイベントが発火するようにする
				// このbegin-endの間にObsArrayでイベントが上がっても(内部でcopyFromを使ったりなど)、itemにイベントは上がらない
				var isAlreadyInUpdate = model._manager ? model._manager.isInUpdate() : false;
				if (!isAlreadyInUpdate) {
					model._manager.beginUpdate();
				}

				var event = itemSetter(model, this, valueObj, null);

				if (event) {
					// 更新した値があればChangeLogを追記
					addUpdateChangeLog(model, event);
				}
				// endUpdateを呼んでイベントを発火
				if (!isAlreadyInUpdate) {
					model._manager.endUpdate();
				}
			},

			/**
			 * DataItemが属しているDataModelインスタンスを返します。
			 * <p>
			 * DataModelに属していないDataItem(removeされたDataItem)から呼ばれた場合はnullを返します。
			 * </p>
			 *
			 * @since 1.1.0
			 * @memberOf DataItem
			 * @returns {DataModel} 自分が所属するデータモデル
			 */
			getModel: function() {
				return this._model;
			},

			/**
			 * type:[]であるプロパティについて、最後にセットされた値がnullかどうかを返します。<br>
			 * type:[]としたプロパティは常にObservableArrayインスタンスがセットされており、set('array', null);
			 * と呼ぶと空配列を渡した場合と同じになります。そのため、「実際にはnullをセットしていた（item.set('array',
			 * null)）」場合と「空配列をセットしていた（item.set('array,' [])）」場合を区別したい場合にこのメソッドを使ってください。<br>
			 * データアイテムを生成した直後は、スキーマにおいてdefaultValueを書いていないまたはnullをセットした場合はtrue、それ以外の場合はfalseを返します。<br>
			 * なお、引数に配列指定していないプロパティを渡した場合は、現在の値がnullかどうかを返します。
			 *
			 * @since 1.1.0
			 * @memberOf DataItem
			 * @param {String} key プロパティ名
			 * @returns {Boolean} 現在指定したプロパティにセットされているのがnullかどうか
			 */
			regardAsNull: function(key) {
				if (this._isArrayProp(key)) {
					return this._nullProps[key] === true;
				}
				return getValue(this, key) === null;
			},

			/**
			 * 指定されたプロパティがtype:[]かどうかを返します。（type:anyでObservableArrayが入っている場合とtype:[]で最初から
			 * ObservableArrayが入っている場合を区別するため）
			 *
			 * @private
			 * @memberOf DataItem
			 * @returns {Boolean} 指定されたプロパティがtype:[]なプロパティかどうか
			 */
			_isArrayProp: function(prop) {
				if (schema[prop] && schema[prop].type && schema[prop].type.indexOf('[]') > -1) {
					//Bindingにおいて比較的頻繁に使われるので、高速化も検討する
					return true;
				}
				return false;
			}
		});
		return DataItem;
	}

	/**
	 * スキーマの継承関係を展開し、フラットなスキーマを生成します。 同じ名前のプロパティは「後勝ち」です。
	 *
	 * @param {Object} schema スキーマオブジェクト(このオブジェクトに展開後のスキーマが格納される)
	 * @param {Object} manager データモデルマネージャ
	 * @param {Object} desc データモデルディスクリプタ
	 */
	function extendSchema(schema, manager, desc) {
		var base = desc.base;
		var baseSchema = desc.schema;

		if (base) {
			if (!manager) {
				//baseが設定されている場合、このデータモデルがマネージャに属していなければ継承元を探せないのでエラー
				//TODO マネージャーに属さないモデルを作成できる仕様用のチェック。
				// そもそもマネージャーに属さないモデルならbase指定している時点でエラーでは...？なのでここのチェックは不要？
				throwFwError(ERR_CODE_NO_MANAGER);
			}

			// base指定がある場合はそのモデルを取得
			var baseModel = manager.models[base.slice(1)];

			// base指定されたモデルのschemaを取得
			baseSchema = baseModel.schema;
		}
		// extendした結果を返す。base指定されていない場合は渡されたdesc.schemaをシャローコピーしたもの。
		$.extend(schema, baseSchema);
	}


	/**
	 * 当該モデルに対応するアップデートログ保持オブジェクトを取得する。 オブジェクトがない場合は生成する。
	 */
	function getModelUpdateLogObj(model) {
		var manager = model._manager;
		var modelName = model.name;

		if (!manager._updateLogs) {
			manager._updateLogs = {};
		}

		if (!manager._updateLogs[modelName]) {
			manager._updateLogs[modelName] = {};
		}

		return manager._updateLogs[modelName];
	}


	/**
	 * 当該モデルが属しているマネージャにUpdateLogを追加する
	 */
	function addUpdateLog(model, type, items) {
		if (!model._manager) {
			return;
		}

		var modelLogs = getModelUpdateLogObj(model);

		for ( var i = 0, len = items.length; i < len; i++) {
			var item = items[i];
			var itemId = item._values[model.idKey];

			if (!modelLogs[itemId]) {
				modelLogs[itemId] = [];
			}
			modelLogs[itemId].push({
				type: type,
				item: item
			});
		}
	}

	/**
	 * 当該モデルが属しているマネージャにUpdateChangeLogを追加する
	 */
	function addUpdateChangeLog(model, ev) {
		if (!model._manager) {
			return;
		}

		var modelLogs = getModelUpdateLogObj(model);

		var itemId = ev.target._values[model.idKey];

		if (!modelLogs[itemId]) {
			modelLogs[itemId] = [];
		}
		modelLogs[itemId].push({
			type: UPDATE_LOG_TYPE_CHANGE,
			ev: ev
		});
	}

	/**
	 * ObsArrayのスナップショットをmanager._oldValueLogsに保存しておく アップデートセッション中に複数回変更しても、保存しておくoldValueは1つでいいので、
	 * すでに保存済みなら配列のsliceはしない。
	 */
	function addObsArrayOldValue(model, item, prop) {
		if (!model._manager) {
			return;
		}

		var modelLogs = getModelOldValueLogObj(model);

		var itemId = item._values[model.idKey];

		if (!modelLogs[itemId]) {
			modelLogs[itemId] = {};
		}

		if (!modelLogs[itemId][prop]) {
			modelLogs[itemId][prop] = getValue(item, prop).toArray();
			return;
		}

		// すでに存在していれば、oldValue保存済みなので、何もしない
		return;
	}

	/**
	 * 当該モデルに対応するアップデートログ保持オブジェクトを取得する。 オブジェクトがない場合は生成する。
	 */
	function getModelOldValueLogObj(model) {
		var manager = model._manager;
		var modelName = model.name;

		if (!manager._oldValueLogs) {
			manager._oldValueLogs = {};
		}

		if (!manager._oldValueLogs[modelName]) {
			manager._oldValueLogs[modelName] = {};
		}

		return manager._oldValueLogs[modelName];
	}

	// =========================================================================
	//
	// Body
	//
	// =========================================================================

	/**
	 * 採番を行う<a href="Sequence.html">Sequence</a>インスタンスを作成します。
	 * <p>
	 * 自動でデータアイテムのナンバリングを行いたい場合などに使用します。
	 * </p>
	 * <p>
	 * 第一引数に開始番号(デフォルト1)、第二引数にステップ数(デフォルト1)、を指定します。
	 * </p>
	 * <p>
	 * 第三引数には戻り値の型を指定します。デフォルトはSEQ_INT（数値型）です。
	 * <ul>
	 * <li><a href="#SEQ_STRING">h5.core.data.SEQ_STRING</a>
	 * <li><a href="#SEQ_INT">h5.core.data.SEQ_INT</a>
	 * </ul>
	 * のいずれかを指定可能です。 SEQ_STRINGを指定した場合、<a href="Sequence.html#current">current()</a>や<a
	 * href="Sequence.html#next">next()<a> を呼ぶと、"1", "123"のような数字文字列が返ります。SEQ_INTの場合は数値が返ります。
	 * </p>
	 *
	 * @since 1.1.0
	 * @memberOf h5.core.data
	 * @param {Number} [start=1] 開始番号
	 * @param {Number} [step=1] ステップ数
	 * @param {Integer} [returnType=2] 戻り値の型(デフォルト number)
	 */
	function createSequence(start, step, returnType) {
		// start,stepをdefault値で、returnTypeだけ指定したい場合、createSequence(null,null,returnType)で呼べるように、==nullで比較している
		var current = start != null ? start : 1;
		var theStep = step != null ? step : 1;

		function currentInt() {
			return current;
		}

		function nextInt() {
			var val = current;
			current += theStep;
			return val;
		}

		function currentString() {
			return current.toString();
		}

		function nextString() {
			var val = current;
			current += theStep;
			return val.toString();
		}

		var methods;
		if (returnType === SEQ_STRING) {
			methods = {
				current: currentString,
				next: nextString,
				returnType: SEQ_STRING
			};
		} else {
			methods = {
				current: currentInt,
				next: nextInt,
				returnType: SEQ_INT
			};
		}
		methods.setCurrent = function(value) {
			current = value;
		};

		/**
		 * 採番を行うためのクラス。
		 * <p>
		 * 自動でデータアイテムのナンバリングを行いたい場合などに使用します。このクラスは<a
		 * href="h5.core.data.html#createSequence">h5.core.data.createSequence()</a>で作成します。
		 * </p>
		 *
		 * @since 1.1.0
		 * @class Sequence
		 */
		function Sequence() {}
		$.extend(Sequence.prototype, methods);

		return new Sequence();
	}




	/**
	 * データモデル。 このクラスは直接newすることはできません。
	 * <p>
	 * <a href="DataModelManager.html#createModel">DataModelManager#createModel()</a>を呼ぶと、DataModelクラスを生成して返します。
	 * </p>
	 * <p>
	 * このクラスは<a href="EventDispatcher.html">EventDispatcherクラス</a>のメソッドを持ちます。イベント関連のメソッドについては<a
	 * href="EventDispatcher.html">EventDispatcherクラス</a>を参照してください。<br>
	 * データモデルは、データモデルが管理するデータアイテムに変更があった場合に'itemsChange'イベントが発火します。
	 * </p>
	 *
	 * @since 1.1.0
	 * @class
	 * @extends EventDispatcher
	 * @name DataModel
	 */
	function DataModel(descriptor, manager, itemValueCheckFuncs) {
		/**
		 * データモデルが持つデータアイテムを持つオブジェクト。
		 * <p>
		 * データアイテムのidをキー、データアイテムインスタンスを値、として保持します。
		 * </p>
		 *
		 * @since 1.1.0
		 * @memberOf DataModel
		 * @type Object
		 * @name items
		 */
		this.items = {};

		/**
		 * データモデルが持つデータアイテムの数
		 *
		 * @since 1.1.0
		 * @memberOf DataModel
		 * @type Integer
		 * @name size
		 */
		this.size = 0;

		/**
		 * データモデル名
		 *
		 * @since 1.1.0
		 * @memberOf DataModel
		 * @type String
		 * @name name
		 */
		this.name = descriptor.name;

		/**
		 * このデータモデルが属しているデータマネージャインスタンス。<br>
		 *
		 * @private
		 * @since 1.1.0
		 * @memberOf DataModel
		 * @type Object
		 * @name _manager
		 */
		this._manager = manager;

		//TODO sequence対応は後日
		//this.idSequence = 0;

		//継承元がある場合はそのプロパティディスクリプタを先にコピーする。
		//継承元と同名のプロパティを自分で定義している場合は
		//自分が持っている定義を優先するため。
		var schema = {};


		//継承を考慮してスキーマを作成
		extendSchema(schema, manager, descriptor);

		/**
		 * このデータモデルが持つスキーマのキーを格納した配列
		 * <p>
		 * スキーマが持つキーを配列で保持します。
		 * </p>
		 *
		 * @since 1.1.0
		 * @memberOf DataModel
		 * @type Array
		 * @name schemaKeys
		 */
		this.schemaKeys = [];

		for ( var prop in schema) {
			if (schema[prop] && schema[prop].id === true) {
				//ディスクリプタは事前検証済みなので、IDフィールドは必ず存在する

				/**
				 * このデータモデルが持つアイテムのIDフィールド名。<br>
				 * <p>
				 * createModel時に自動的に設定されます。書き換えないでください。
				 * </p>
				 *
				 * @since 1.1.0
				 * @memberOf DataModel
				 * @type String
				 * @name idKey
				 */
				this.idKey = prop;
			}
			this.schemaKeys.push(prop);
		}

		//DataModelのschemaプロパティには、継承関係を展開した後のスキーマを格納する
		/**
		 * データモデルのスキーマ。
		 * <p>
		 * 継承関係を展開した後のスキーマを保持します。
		 * </p>
		 *
		 * @since 1.1.0
		 * @memberOf DataModel
		 * @type Object
		 * @name schema
		 */
		this.schema = schema;

		var schemaIdType = schema[this.idKey].type;
		if (schemaIdType) {
			if (schemaIdType === 'string') {
				this._idType = ID_TYPE_STRING;
			} else {
				this._idType = ID_TYPE_INT;
			}
		} else {
			this._idType = ID_TYPE_STRING;
		}

		// 実プロパティと依存プロパティを列挙
		var realProps = [];
		var dependProps = [];
		for ( var p in schema) {
			if (schema[p] && schema[p].depend) {
				dependProps.push(p);
			} else {
				realProps.push(p);
			}
		}

		/**
		 * プロパティの依存関係マップ
		 *
		 * @private
		 * @since 1.1.0
		 * @type Object
		 * @memberOf DataModel
		 */
		this._dependencyMap = createDependencyMap(schema);

		/**
		 * モデルが持つ依存プロパティ
		 *
		 * @private
		 * @since 1.1.0
		 * @type Array
		 * @memberOf DataModel
		 */
		this._dependProps = dependProps;

		/**
		 * モデルが持つ実プロパティ(依存しないプロパティ)
		 *
		 * @private
		 * @since 1.1.0
		 * @type Array
		 * @memberOf DataModel
		 */
		this._realProps = realProps;

		/**
		 * プロパティの型・制約チェック関数<br>
		 * プロパティ名をキー、値としてチェック関数を持つ
		 *
		 * @private
		 * @since 1.1.0
		 * @type Object
		 * @memberOf DataModel
		 */
		this._itemValueCheckFuncs = itemValueCheckFuncs;

		/**
		 * このデータモデルに対応するデータアイテムのコンストラクタ関数
		 *
		 * @private
		 * @since 1.1.0
		 * @type function
		 * @memberOf DataModel
		 */
		this._itemConstructor = createDataItemConstructor(this, descriptor);
	}

	//EventDispatcherの機能を持たせるため、prototypeをコピーし、そのうえでDataModel独自のプロパティを追加する
	$.extend(DataModel.prototype, EventDispatcher.prototype, {
		/**
		 * 指定されたIDと初期値がセットされたデータアイテムを生成します。
		 * <p>
		 * データアイテムはこのデータモデルに紐づけられた状態になっています。
		 * </p>
		 * <p>
		 * 指定されたIDのデータアイテムがすでにこのデータモデルに存在した場合は、 既に存在するデータアイテムを返します（新しいインスタンスは生成されません）。
		 * </p>
		 * <p>
		 * 従って、1つのデータモデルは、1IDにつき必ず1つのインスタンスだけを保持します。
		 * なお、ここでIDの他に初期値も渡された場合は、既存のインスタンスに初期値をセットしてから返します。
		 * このとき、当該インスタンスにイベントハンドラが設定されていれば、changeイベントが（通常の値更新と同様に）発生します。
		 * </p>
		 * <p>
		 * 引数にはディスクリプタオブジェクトまたはその配列を指定します。ディスクリプタオブジェクトについては<a
		 * href="/conts/web/view/tutorial-data-model/descriptor">チュートリアル(データモデル編)&gt;&gt;ディスクリプタの書き方</a>をご覧ください。
		 * </p>
		 *
		 * @since 1.1.0
		 * @memberOf DataModel
		 * @param {Object|Object[]} objOrArray ディスクリプタオブジェクト、またはその配列
		 * @returns {DataItem|DataItem[]} データアイテム、またはその配列
		 */
		create: function(objOrArray) {
			// modelがmanagerを持たない(dropModelされた)ならエラー
			if (!this._manager) {
				throwFwError(ERR_CODE_CANNOT_CHANGE_DROPPED_MODEL, [this.name, 'create']);
			}

			// objOrArrayがobjでもArrayでもなかったらエラー
			if (typeof objOrArray !== 'object' && !$.isArray(objOrArray)) {
				throwFwError(ERR_CODE_INVALID_CREATE_ARGS);
			}

			var ret = [];
			var idKey = this.idKey;

			//removeで同時に複数のアイテムが指定された場合、イベントは一度だけ送出する。
			//そのため、事前にアップデートセッションに入っている場合はそのセッションを引き継ぎ、
			//入っていない場合は一時的にセッションを作成する。
			var isAlreadyInUpdate = this._manager ? this._manager.isInUpdate() : false;

			if (!isAlreadyInUpdate) {
				this._manager.beginUpdate();
			}

			var actualNewItems = [];

			var items = wrapInArray(objOrArray);
			for ( var i = 0, len = items.length; i < len; i++) {
				var valueObj = items[i];

				var itemId = valueObj[idKey];
				//idが空文字、null、undefined、はid指定エラー
				if (itemId === '' || itemId == null) {
					throwFwError(ERR_CODE_NO_ID);
				}
				//idがstringでもintegerでもない場合は制約違反エラー
				if (!isIntegerValue(itemId, true) && !isString(itemId)) {
					throwFwError(ITEM_ERRORS.ERR_CODE_INVALID_ITEM_VALUE);
				}

				var storedItem = this._findById(itemId);
				if (storedItem) {
					//返す値にstoredItemを追加
					ret.push(storedItem);

					// 既に存在するオブジェクトの場合は値を更新。ただし、valueObjのIDフィールドは無視（上書きなので問題はない）
					var event = itemSetter(this, storedItem, valueObj, null, [idKey]);
					if (!event) {
						//itemSetterが何も返さなかった = 更新する値が何もない
						continue;
					}

					addUpdateChangeLog(this, event);
				} else {
					var newItem = new this._itemConstructor(valueObj);

					this.items[itemId] = newItem;
					this.size++;

					actualNewItems.push(newItem);
					ret.push(newItem);
				}
			}

			if (actualNewItems.length > 0) {
				addUpdateLog(this, UPDATE_LOG_TYPE_CREATE, actualNewItems);
			}

			if (!isAlreadyInUpdate) {
				//既存のアイテムが変更されていればアイテムのイベントを上げる
				this._manager.endUpdate();
			}

			if ($.isArray(objOrArray)) {
				return ret;
			}
			return ret[0];
		},

		/**
		 * 指定されたIDのデータアイテムを返します。
		 * <p>
		 * 当該IDを持つアイテムをこのデータモデルが保持していない場合はnullを返します。 引数にIDの配列を渡した場合に一部のIDのデータアイテムが存在しなかった場合、
		 * 戻り値の配列の対応位置にnullが入ります。
		 * </p>
		 * <p>
		 * （例：get(['id1', 'id2', 'id3']) でid2のアイテムがない場合、戻り値は [item1, null, item3] のようになる ）
		 * </p>
		 *
		 * @since 1.1.0
		 * @memberOf DataModel
		 * @param {String|String[]} idOrArray ID、またはその配列
		 * @returns {DataItem|DataItem[]} データアイテム、またはその配列
		 */
		get: function(idOrArray) {
			if ($.isArray(idOrArray) || h5.core.data.isObservableArray(idOrArray)) {
				var ret = [];
				for ( var i = 0, len = idOrArray.length; i < len; i++) {
					ret.push(this._findById(idOrArray[i]));
				}
				return ret;
			}
			//引数の型チェックはfindById内で行われる
			return this._findById(idOrArray);
		},

		/**
		 * 指定されたIDのデータアイテムをこのデータモデルから削除します。
		 * <p>
		 * 当該IDを持つアイテムをこのデータモデルが保持していない場合はnullを返します。 引数にIDの配列を渡した場合に一部のIDのデータアイテムが存在しなかった場合、
		 * 戻り値の配列の対応位置にnullが入ります。 （例：remove(['id1', 'id2', 'id3']) でid2のアイテムがない場合、 戻り値は [item1,
		 * null, item3]のようになります。） 引数にID(文字列)またはデータアイテム以外を渡した場合はnullを返します。
		 * </p>
		 *
		 * @since 1.1.0
		 * @memberOf DataModel
		 * @param {String|DataItem|String[]|DataItem[]} objOrItemIdOrArray 削除するデータアイテム
		 * @returns {DataItem|DataItem[]} 削除したデータアイテム
		 */
		remove: function(objOrItemIdOrArray) {
			// modelがmanagerを持たない(dropModelされた)ならエラー
			if (!this._manager) {
				throwFwError(ERR_CODE_CANNOT_CHANGE_DROPPED_MODEL, [this.name, 'remove']);
			}

			//removeで同時に複数のアイテムが指定された場合、イベントは一度だけ送出する。
			//そのため、事前にアップデートセッションに入っている場合はそのセッションを引き継ぎ、
			//入っていない場合は一時的にセッションを作成する。
			var isAlreadyInUpdate = this._manager ? this._manager.isInUpdate() : false;
			if (!isAlreadyInUpdate) {
				this._manager.beginUpdate();
			}

			var idKey = this.idKey;
			var ids = wrapInArray(objOrItemIdOrArray);

			var actualRemovedItems = [];
			var ret = [];

			for ( var i = 0, len = ids.length; i < len; i++) {
				if (!this.has(ids[i])) {
					//指定されたアイテムが存在しない場合はnull
					ret.push(null);
					continue;
				}

				var id = (isString(ids[i]) || isIntegerValue(ids[i], true)) ? ids[i]
						: ids[i]._values[idKey];

				var item = this.items[id];

				delete this.items[id];

				this.size--;

				ret.push(item);
				item._model = null;
				actualRemovedItems.push(item);
			}

			if (actualRemovedItems.length > 0) {
				addUpdateLog(this, UPDATE_LOG_TYPE_REMOVE, actualRemovedItems);
			}

			if (!isAlreadyInUpdate) {
				this._manager.endUpdate();
			}

			if ($.isArray(objOrItemIdOrArray)) {
				return ret;
			}
			return ret[0];
		},

		/**
		 * 保持しているすべてのデータアイテムを削除します。
		 *
		 * @since 1.1.3
		 * @memberOf DataModel
		 * @returns {DataItem[]} 削除されたデータアイテム。順序は不定です。
		 */
		removeAll: function() {
			var items = this.toArray();
			if (items.length > 0) {
				this.remove(items);
			}
			return items;
		},

		/**
		 * 指定されたデータアイテムを保持しているかどうかを返します。
		 * <p>
		 * 文字列または整数値が渡された場合はIDとみなし、 オブジェクトが渡された場合はデータアイテムとみなします。
		 * オブジェクトが渡された場合、自分が保持しているデータアイテムインスタンスかどうかをチェックします。
		 * </p>
		 * <p>
		 * 従って、同じ構造を持つ別のインスタンスを引数に渡した場合はfalseが返ります。
		 * データアイテムインスタンスを引数に渡した場合に限り（そのインスタンスをこのデータモデルが保持していれば）trueが返ります。
		 * </p>
		 *
		 * @since 1.1.0
		 * @memberOf DataModel
		 * @param {String|Object} idOrObj ID文字列またはデータアイテムオブジェクト
		 * @returns {Boolean} 指定されたIDのデータアイテムをこのデータモデルが保持しているかどうか
		 */
		has: function(idOrObj) {
			if (isString(idOrObj) || isIntegerValue(idOrObj, true)) {
				return !!this._findById(idOrObj);
			} else if (typeof idOrObj === 'object') {
				//型の厳密性はitemsとの厳密等価比較によってチェックできるので、if文ではtypeofで充分
				return idOrObj != null && $.isFunction(idOrObj.get)
						&& idOrObj === this.items[idOrObj.get(this.idKey)];
			} else {
				return false;
			}
		},

		/**
		 * このモデルが属しているマネージャを返します。
		 * <p>
		 * dropModelされたモデルの場合はnullを返します。
		 * </p>
		 *
		 * @since 1.1.0
		 * @memberOf DataModel
		 * @returns {DataManager} このモデルが属しているマネージャ
		 */
		getManager: function() {
			return this._manager;
		},

		/**
		 * 引数にプロパティ名と値を指定し、 値がそのプロパティの制約条件を満たすかどうかをチェックします。
		 *
		 * @private
		 * @since 1.1.0
		 * @memberOf DataModel
		 * @param {String} プロパティ名
		 * @value {Any} 値
		 * @returns {Boolean} 値がプロパティの制約条件を満たすならtrue
		 */
		_validateItemValue: function(prop, value) {
			return this._itemValueCheckFuncs[prop](value);
		},

		/**
		 * 指定されたIDのデータアイテムを返します。 アイテムがない場合はnullを返します。
		 *
		 * @private
		 * @since 1.1.0
		 * @memberOf DataModel
		 * @param {String} id データアイテムのID
		 * @returns {DataItem} データアイテム、存在しない場合はnull
		 */
		_findById: function(id) {
			var item = this.items[id];
			return item === undefined ? null : item;
		},

		/**
		 * 引数で指定されたchangeイベントに基づいて、itemsChangeイベントを即座に発火させます。
		 *
		 * @private
		 * @since 1.1.0
		 * @memberOf DataModel
		 * @param {Object} event DataItemのchangeイベント
		 */
		_dispatchItemsChangeEvent: function(event) {
			var modelEvent = createDataModelItemsChangeEvent([], [], [], [event]);
			this.dispatchEvent(modelEvent);

			// managerがあれば(dropされたモデルでなければ)managerのイベントを発火
			if (this._manager) {
				modelEvent.target = this;
				this._manager._dataModelItemsChangeListener(modelEvent);
			}
		},

		/**
		 * データモデルが持つデータアイテムを配列に詰めて返します。 配列中のデータアイテムの順番は不定です。
		 *
		 * @since 1.1.0
		 * @memberOf DataModel
		 * @returns {Array} モデルが持つデータアイテムが格納された配列
		 */
		toArray: function() {
			var ret = [];
			var items = this.items;
			for ( var id in items) {
				if (items.hasOwnProperty(id)) {
					ret.push(items[id]);
				}
			}
			return ret;
		}
	});

	/**
	 * データモデルマネージャ
	 * <p>
	 * データモデルを管理するデータモデルマネージャクラスです。このインスタンスは<a
	 * href="h5.core.data.html#createManager">h5.core.data.createManager()</a>で作成します。
	 * </p>
	 * <p>
	 * このクラスは<a href="EventDispatcher.html">EventDispatcherクラス</a>のメソッドを持ちます。イベント関連のメソッドについては<a
	 * href="EventDispatcher.html">EventDispatcherクラス</a>を参照してください。<br>
	 * データモデルマネージャは、データモデルマネージャが管理するデータモデルに変更があった場合に'itemsChange'イベントが発火します。
	 * </p>
	 *
	 * @since 1.1.0
	 * @class
	 * @extends EventDispatcher
	 * @name DataModelManager
	 */
	function DataModelManager(managerName) {
		if (!isValidNamespaceIdentifier(managerName)) {
			throwFwError(ERR_CODE_INVALID_MANAGER_NAME);
		}

		/**
		 * このデータモデルマネージャが管理するDataModelインスタンス。
		 * <p>
		 * <a href="#createModel">createmodel()</a>で作成したモデルは、データモデルマネージャの管理下に置かれ、modelsから参照できます。
		 * </p>
		 * <p>
		 * {モデル名: データモデルインスタンス, ...} の構造を持つオブジェクトです。
		 * </p>
		 *
		 * @since 1.1.0
		 * @name models
		 * @type {Object}
		 * @memberOf DataModelManager
		 */
		this.models = {};

		/**
		 * データモデルマネージャ名
		 * <p>
		 * <a href="h5.core.data.html#createManager">h5.core.data.createManager()</a>の第一引数に指定した値が格納されます。
		 * </p>
		 *
		 * @since 1.1.0
		 * @name name
		 * @type {String}
		 * @memberOf DataModelManager
		 */
		this.name = managerName;


		/**
		 * アップデートログ
		 * <p>
		 * マネージャの管理下にあるデータモデル、アイテムのイベントをストアしておくためのオブジェクトです。内部で使用します。
		 * </p>
		 *
		 * @private
		 * @since 1.1.0
		 * @name _updateLogs
		 * @type {Object}
		 * @memberOf DataModelManager
		 */
		this._updateLogs = null;
	}
	DataModelManager.prototype = new EventDispatcher();
	$.extend(DataModelManager.prototype, {
		/**
		 * データモデルを作成します。
		 * <p>
		 * 引数にはデータモデルディスクリプタを渡します。
		 * </p>
		 *
		 * @since 1.1.0
		 * @param {Object} descriptor データモデルディスクリプタ
		 * @param {String} descriptor.name データモデル名。必須。
		 * @param {String} descriptor.base
		 *            マネージャに属する別のデータモデルのschemaを継承する場合に指定します。『'@'+継承先データモデル名』で指定してください。
		 * @param {Object} descriptor.schema スキーマを定義したオブジェクトを指定します。必須。
		 * @memberOf DataModelManager
		 */
		createModel: function(descriptor) {
			if ($.isArray(descriptor)) {
				var l = descriptor.length;
				if (!l) {
					//空配列
					throwFwError(ERR_CODE_INVALID_DESCRIPTOR, null,
							[createItemDescErrorReason(DESC_ERR_DETAIL_NOT_OBJECT)]);
				}
				var dependMap = {};
				var namesInDescriptors = [];
				// 依存関係のチェック
				// 要素がオブジェクトであり、name、schemaプロパティを持っていない場合はcatch節で、ディスクリプタのエラーを投げる
				for ( var i = 0; i < l; i++) {
					try {
						namesInDescriptors.push(descriptor[i].name);
						var depends = [];
						if (descriptor[i].base) {
							depends.push(descriptor[i].base.substring(1));
						}
						for ( var p in descriptor[i].schema) {
							var propObj = descriptor[i].schema[p];
							if (!propObj) {
								continue;
							}
							var type = propObj.type;
							if (type && type.substring(0, 1) === '@') {
								type = (type.indexOf('[]') === -1) ? type.substring(1) : type
										.substring(1, type.length - 2);
								depends.push(type);
							}
						}
						dependMap[i] = {
							depends: depends
						};
					} catch (e) {
						//descriptorがオブジェクトでない、またはnameとschemaが設定されていない。またはname,baseが文字列でない、schemaがオブジェクトでない
						throwFwError(ERR_CODE_INVALID_DESCRIPTOR);
					}
				}
				// dependMapを元に、循環参照チェック
				var retObj = {
					size: 0
				};
				while (retObj.size < l) {
					// 見つからなかったモデルを覚えておく
					// 循環参照のエラーなのか、単に存在しないモデル名指定によるエラーなのかを区別するため
					var noExistModels = {};

					// このwhileループ内で1つでも登録されたか
					var registed = false;

					// descriptorでループさせて、依存関係が解決された居たらデータモデルを登録
					for ( var i = 0; i < l; i++) {
						if (!dependMap[i].registed) {
							var depends = dependMap[i].depends;
							for ( var j = 0, len = depends.length; j < len; j++) {
								if (!this.models[depends[j]]) {
									noExistModels[depends[j]] = true;
									break;
								}
							}
							if (j === len) {
								// 依存しているものはすべて登録済みなら登録
								retObj[i] = registerDataModel(descriptor[i], this);
								retObj.size++;
								registed = true;
								dependMap[i].registed = true;
							}
						}
					}
					if (!registed) {
						// whileループの中で一つも登録されなかった場合は、存在しないデータモデル名を依存指定、または循環参照
						// 存在しなかったデータモデル名が全てディスクリプタに渡されたモデル名のいずれかだったら、それは循環参照エラー
						var isCircular = true;
						for ( var modelName in noExistModels) {
							if ($.inArray(modelName, namesInDescriptors) === -1) {
								isCircular = false;
								break;
							}
						}
						if (isCircular) {
							// 循環参照エラー
							throwFwError(ERR_CODE_DESCRIPTOR_CIRCULAR_REF);
						}
						throwFwError(ERR_CODE_INVALID_DESCRIPTOR, null, [createItemDescErrorReason(
								DESC_ERR_DETAIL_NO_EXIST_BASE, modelName)]);
					}
				}
				var retAry = [];
				for ( var i = 0; i < l; i++) {
					retAry.push(retObj[i]);
				}
				return retAry;
			}
			//registerDataModelは初めにDescriptorの検証を行う。
			//検証エラーがある場合は例外を送出する。
			//エラーがない場合はデータモデルを返す（登録済みの場合は、すでにマネージャが持っているインスタンスを返す）。
			return registerDataModel(descriptor, this);
		},

		/**
		 * 指定されたデータモデルを削除します。
		 * <p>
		 * データアイテムを保持している場合、アイテムをこのデータモデルからすべて削除した後 データモデル自体をマネージャから削除します。
		 * </p>
		 *
		 * @since 1.1.0
		 * @param {String|DataModel} nameOrModel データモデル名またはデータモデルインスタンス
		 * @memberOf DataModelManager
		 */
		dropModel: function(nameOrModel) {
			//TODO dropModelするときに依存していたらどうするか？
			//エラーにしてしまうか。
			var name = isString(nameOrModel) ? nameOrModel
					: (typeof nameOrModel === 'object' ? nameOrModel.name : null);

			if (!name || !this.models[name]) {
				return;
			}
			var model = this.models[name];
			model._manager = null;
			delete this.models[name];
			return model;
		},

		/**
		 * アップデートセッション中かどうかを返します。
		 * <p>
		 * beginUpdate()が呼ばれてからendUpdate()が呼ばれるまでの間はアップデートセッション中です。
		 * </p>
		 *
		 * @since 1.1.0
		 * @returns {Boolean} アップデートセッション中かどうか
		 * @memberOf DataModelManager
		 */
		isInUpdate: function() {
			return this._updateLogs !== null;
		},

		/**
		 * アップデートセッションを開始します。
		 * <p>
		 * beginUpdate()が呼ばれると、アップデートセッションを開始します。<a href="#endUpdate">endUpdate()</a>を呼ぶとアップデートセッションを解除します。
		 * </p>
		 * <p>
		 * 既にアップデートセッション中であれば何もしません。
		 * </p>
		 * <p>
		 * アップデートセッション中は、このDataModelManager、及びこのの管理下にあるDataModel、DataItemのイベントは発火しません。
		 * endUpdate()が呼ばれた時点で、イベントが発火します。
		 * </p>
		 * <p>
		 * アップデートセッション中の変更イベントはすべてマージされてendUpdate()時に発火します。
		 * </p>
		 *
		 * <pre>
		 * 例：
		 *
		 * // managerの管理下にあるDataItem
		 * item.set('value', 'a');
		 *
		 * item.addEventListener('change', function(e){
		 *     // oldValueとnewValueをalertで表示するイベントリスナ
		 *     alert('oldValue:' + e.prop.value.oldValue + ', newValue:' + e.prop.value.newValue);
		 * });
		 *
		 * // アップデートセッション
		 * manager.beginUpdate();
		 * item.set('value', 'b');
		 * item.set('value', 'c');
		 * manager.endUpdate();
		 *
		 * // &quot;oldValue: a, newValue: c&quot; とアラートが出る
		 * </pre>
		 *
		 * @since 1.1.0
		 * @returns {Boolean} アップデートセッション中かどうか
		 * @memberOf DataModelManager
		 */
		beginUpdate: function() {
			if (this.isInUpdate()) {
				return;
			}

			this._updateLogs = {};
		},

		/**
		 * アップデートセッションを終了します。
		 * <p>
		 * アップデートセッション中でなければ何もしません。イベントの発火など詳細は<a href="#beginUpdate">beginUpdate()</a>の説明を参照してください。
		 * </p>
		 *
		 * @since 1.1.0
		 * @memberOf DataModelManager
		 */
		endUpdate: function() {
			if (!this.isInUpdate()) {
				return;
			}

			var updateLogs = this._updateLogs;
			var oldValueLogs = this._oldValueLogs;
			//_updateLog, _oldValueLogsをまず削除する。イベントハンドラ内で、値を変更された時に_updateLogをきちんと残せるようにするため。
			this._updateLogs = null;
			this._oldValueLogs = null;

			function getFirstCRLog(itemLogs, lastPos) {
				for ( var i = 0; i < lastPos; i++) {
					var type = itemLogs[i].type;
					if ((type === UPDATE_LOG_TYPE_CREATE || type === UPDATE_LOG_TYPE_REMOVE)) {
						return itemLogs[i];
					}
				}
				return null;
			}


			/**
			 * 内部でDataItemごとのイベントを発火させます。 変更が1つでもあればモデルイベントオブジェクト(のひな形)を返しますが、変更がない場合はfalseを返します
			 */
			function createDataModelChanges(model, modelUpdateLogs) {
				var recreated = [];
				var created = [];
				var changed = [];
				var removed = [];

				for ( var itemId in modelUpdateLogs) {
					var itemLogs = modelUpdateLogs[itemId];
					var isChangeOnly = true;

					var changeEventStack = [];

					//新しい変更が後ろに入っているので、降順で履歴をチェックする
					for ( var i = itemLogs.length - 1; i >= 0; i--) {
						var log = itemLogs[i]; //あるitemについてのログ
						var logType = log.type; //当該ログの種類

						if (logType === UPDATE_LOG_TYPE_CHANGE) {
							changeEventStack.push(log.ev);
						} else {
							//あるアイテムについての今回の変更のうち、最初に存在するCREATEまたはREMOVEのログ
							//(従って、changeのみの場合存在しない場合もある)
							var firstCRLog = getFirstCRLog(itemLogs, i);

							if (logType === UPDATE_LOG_TYPE_CREATE) {
								//begin->remove->create->end のような操作が行われた場合、
								//begin-endの前後でアイテムのインスタンスが変わってしまう。
								//これをイベントで判別可能にするため、remove->createだった場合はcreatedではなくrecreatedに入れる。
								//なお、begin->remove->create->remove->create->endのような場合、
								//途中のcreate->removeは（begin-endの外から見ると）無視してよいので、
								//oldItemには「最初のremoveのときのインスタンス」、newItemには「最後のcreateのときのインスタンス」が入る。
								//また、begin->create->remove->create->endの場合は、begin-endの外から見ると"create"扱いにすればよい。

								//なお、createイベントはDataItemからは発火しない。(createはdependプロパティ内でのみ起こる)

								if (firstCRLog && firstCRLog.type === UPDATE_LOG_TYPE_REMOVE) {
									recreated.push({
										id: itemId,
										oldItem: firstCRLog.item,
										newItem: log.item
									});
								} else {
									created.push(log.item);
								}
							} else {
								//ここに来たら必ずUPDATE_LOG_TYPE_REMOVE

								var removedItem;

								if (firstCRLog && firstCRLog.type === UPDATE_LOG_TYPE_REMOVE) {
									//begin->remove->create->remove->endの場合、begin-endの外から見ると
									//「最初のremoveで取り除かれた」という扱いにすればよい。
									removedItem = firstCRLog.item;
								} else if (!firstCRLog) {
									//createまたはremoveのログが最後のremoveより前にない
									//＝beginより前からアイテムが存在し、始めてremoveされた
									//＝通常のremoveとして扱う
									removedItem = log.item;
								} else {
									//begin->create-> ( remove->create-> ) remove -> end つまり
									//beginより前にアイテムがなく、セッション中に作られたが最終的には
									//またremoveされた場合、begin-endの外から見ると「何もなかった」と扱えばよい。
									removedItem = null;
								}

								if (removedItem) {
									removed.push(removedItem);

									var removeEvent = {
										type: 'remove',
										model: model
									};
									removedItem.dispatchEvent(removeEvent);
								}
							}

							isChangeOnly = false;

							//CREATEまたはREMOVEを見つけたら、そこで走査を終了
							break;
						}
					}

					//新規追加or削除の場合はcreated, removedに当該オブジェクトが入ればよい。
					//あるアイテムのcreate,removeどちらのログもなかったということは
					//そのオブジェクトはbeginの時点から存在しendのタイミングまで残っていた、ということになる。
					//従って、あとはchangeのイベントオブジェクトをマージすればよい。
					if (isChangeOnly && changeEventStack.length > 0) {
						var mergedProps = {};
						//changeEventStackはより「古い」イベントが「後ろ」に入っている。
						for ( var i = changeEventStack.length - 1; i >= 0; i--) {
							for ( var p in changeEventStack[i].props) {
								if (!mergedProps[p]) {
									// oldValueのセット
									// type:[]ならmanager._oldValueLogsから持ってくる
									if (h5.core.data.isObservableArray(model.get(itemId).get(p))) {
										var oldValue = oldValueLogs && oldValueLogs[model.name]
												&& oldValueLogs[model.name][itemId]
												&& oldValueLogs[model.name][itemId][p];
										if (!model.get(itemId).get(p).equals(oldValue)) {
											//プロパティがObservableArrayの場合、equalsの結果がfalseの場合のみ
											//mergedPropsにセットする。つまり、equalsがtrueの場合は「変更がなかった」ことになる。
											mergedProps[p] = {
												oldValue: oldValue
											};
										}
									} else {
										mergedProps[p] = {
											oldValue: changeEventStack[i].props[p].oldValue
										};
									}
								}
							}
						}
						// 今のアイテムがoldValueと違う値を持っていたらmergedPropsにnewValueをセット
						// 最終的に値が変わっているかどうかも同時にチェックする
						//TODO oldValueは配列ならmanager._oldValueLogsにある
						var changedProps = false;
						for ( var p in mergedProps) {
							var oldValue = mergedProps[p].oldValue;
							var currentValue = model.get(itemId).get(p);
							if (oldValue === currentValue
									|| isBothStrictNaN(oldValue, currentValue)) {
								delete mergedProps[p];
							} else {
								mergedProps[p].newValue = model.get(itemId).get(p);
								changedProps = true;
							}
						}
						if (changedProps) {
							var mergedChange = {
								type: 'change',
								target: changeEventStack[0].target,
								props: mergedProps
							};

							changed.push(mergedChange);

							mergedChange.target.dispatchEvent(mergedChange);
						}
					}
				}

				// 何も変更がなかった場合は、falseを返す
				if (created.length === 0 && recreated.length === 0 && removed.length === 0
						&& changed.length === 0) {
					return false;
				}
				return {
					created: created,
					recreated: recreated,
					removed: removed,
					changed: changed
				};
			}

			//endUpdateの処理フローここから

			var modelChanges = {};
			for ( var modelName in updateLogs) {
				if (!updateLogs.hasOwnProperty(modelName)) {
					continue;
				}
				var mc = createDataModelChanges(this.models[modelName], updateLogs[modelName]);
				if (mc) {
					modelChanges[modelName] = mc;
				}
			}

			//高速化のため、createDataModelChanges()の中で各DataItemからのイベントを発火させている

			//各DataModelからイベントを発火。
			//全てのモデルの変更が完了してから各モデルの変更イベントを出すため、同じループをもう一度行う
			var modelChanged = false;
			for ( var modelName in modelChanges) {
				modelChanged = true;
				var mc = modelChanges[modelName];
				this.models[modelName].dispatchEvent(createDataModelItemsChangeEvent(mc.created,
						mc.recreated, mc.removed, mc.changed));
			}

			var event = {
				type: EVENT_ITEMS_CHANGE,
				models: modelChanges
			};

			//最後に、マネージャから全ての変更イベントをあげる。変更がない場合は何もしない
			if (modelChanged) {
				this.dispatchEvent(event);
			}
		},

		_dataModelItemsChangeListener: function(event) {
			var manager = event.target.manager;

			var modelsChange = {};
			modelsChange[event.target.name] = event;

			var managerEvent = {
				type: EVENT_ITEMS_CHANGE,
				models: modelsChange
			};

			manager.dispatchEvent(managerEvent);
		}
	});

	/**
	 * データモデルを作成します。最初にdescriptorの検証を行い、エラーがある場合は例外を送出します。
	 *
	 * @param {Object} descriptor データモデルディスクリプタ（事前検証済み）
	 * @param {DataModelManager} manager データモデルマネージャ
	 * @returns {DataModel} 登録されたデータモデル
	 */
	function registerDataModel(descriptor, manager) {

		//ディスクリプタの検証を最初に行い、以降はValidなディスクリプタが渡されていることを前提とする
		//ここでは1つでもエラーがあればすぐにエラーを出す
		var errorReason = validateDescriptor(descriptor, manager, true);
		if (errorReason.length > 0) {
			throwFwError(ERR_CODE_INVALID_DESCRIPTOR, null, errorReason);
		}

		var extendedSchema = {};
		extendSchema(extendedSchema, manager, descriptor);

		var itemValueCheckFuncs = createCheckValueByDescriptor(extendedSchema, manager);

		var defaultValueErrorReason = validateDefaultValue(extendedSchema, itemValueCheckFuncs,
				true);
		if (defaultValueErrorReason.length > 0) {
			throwFwError(ERR_CODE_INVALID_DESCRIPTOR, null, defaultValueErrorReason);
		}

		//ここに到達したら、ディスクリプタにはエラーがなかったということ

		var modelName = descriptor.name;

		if (manager.models[modelName]) {
			//既に登録済みのモデルの場合は今持っているインスタンスを返す
			fwLogger.info(MSG_ERROR_DUP_REGISTER, this.name, modelName);
			return manager.models[modelName];
		}

		//新しくモデルを作ってマネージャに登録
		var model = new DataModel(descriptor, manager, itemValueCheckFuncs);

		manager.models[modelName] = model;

		return model;
	}

	/**
	 * 第一引数に指定された名前のデータモデルマネージャを作成します。
	 * <p>
	 * 第2引数が渡された場合、その名前空間に<a href="DataModelManager.html">DataModelManager</a>インスタンスを公開します。
	 * </p>
	 *
	 * @since 1.1.0
	 * @memberOf h5.core.data
	 * @param {String} name マネージャ名
	 * @param {String} [namespace] 公開先名前空間
	 * @returns {DataModelManager} データモデルマネージャ
	 */
	function createManager(managerName, namespace) {
		if (!isValidNamespaceIdentifier(managerName)) {
			throwFwError(ERR_CODE_INVALID_MANAGER_NAME);
		}

		//データモデルマネージャインスタンスを生成
		var manager = new DataModelManager(managerName);

		//第2引数が省略される場合もあるので、厳密等価でなく通常の等価比較を行う
		if (namespace != null) {
			//指定された名前空間に、managerNameでマネージャを公開する
			// 空文字指定ならグローバルに公開する
			if (namespace === '') {
				namespace = 'window';
			}
			var o = {};
			o[managerName] = manager;
			h5.u.obj.expose(namespace, o);
		}

		return manager;
	}


	//=============================
	// Expose to window
	//=============================
	/**
	 * dataの名前空間にデータモデルのものを公開 (名前空間はh5.core.data_observableですでに作成されてます)
	 */
	h5.u.obj.expose('h5.core.data', {
		createManager: createManager,
		createSequence: createSequence,
		SEQ_STRING: SEQ_STRING,
		SEQ_INT: SEQ_INT
	});
})();

/* h5.core.view_binding */
(function() {
	// =========================================================================
	//
	// Constants
	//
	// =========================================================================

	// =============================
	// Production
	// =============================

	/** Node.ELEMENT_NODE。IE8-ではNodeがないので自前で定数を作っている */
	var NODE_TYPE_ELEMENT = 1;

	var DATA_H5_BIND = 'data-h5-bind';

	var DATA_H5_CONTEXT = 'data-h5-context';

	var DATA_H5_LOOP_CONTEXT = 'data-h5-loop-context';

	var DATA_H5_DYN_CTX = 'data-h5-dyn-ctx';

	var DATA_H5_DYN_VID = 'data-h5-dyn-vid';

	var DATA_H5_DYN_BIND_ROOT = 'data-h5-dyn-bind-root';

	/** 初期状態のclassNameを保存しておく属性 */
	var DATA_H5_DYN_CN = 'data-h5-dyn-cn';

	/** 1つのバインド指定のターゲットとソースのセパレータ（「text:prop」の「:」） */
	var BIND_DESC_TARGET_SEPARATOR = ':';

	/** 複数のバインド指定のセパレータ（「text:prop1; attr(href):prop2」の「;」） */
	var BIND_DESC_SEPARATOR = ';';

	/** バインドターゲットのカッコ内を取得するための正規表現（「attr(href)」の「href」を取得） */
	var BIND_TARGET_DETAIL_REGEXP = /\(\s*(\S+)\s*\)/;

	// エラーコード
	/** data-h5-bindでattr, styleバインドを行う場合は、「style(color)」のように具体的なバインド先を指定する必要があります。 */
	var ERR_CODE_REQUIRE_DETAIL = 7100;

	/** 不明なバインド先が指定されました。html,style等決められたバインド先を指定してください。 */
	var ERR_CODE_UNKNOWN_BIND_DIRECTION = 7101;

	/** コンテキスト値が不正です。data-h5-contextの場合はオブジェクト、data-h5-loop-contextの場合は配列を指定してください。 */
	var ERR_CODE_INVALID_CONTEXT_SRC = 7102;


	// =============================
	// Development Only
	// =============================

	var fwLogger = h5.log.createLogger('h5.core.view_binding');

	/* del begin */
	var errMsgMap = {};
	errMsgMap[ERR_CODE_REQUIRE_DETAIL] = 'data-h5-bindでattr, styleバインドを行う場合は、「style(color)」のように具体的なバインド先を指定する必要があります。';
	errMsgMap[ERR_CODE_UNKNOWN_BIND_DIRECTION] = '不明なバインド先が指定されました。html,style等決められたバインド先を指定してください。';
	errMsgMap[ERR_CODE_INVALID_CONTEXT_SRC] = 'コンテキスト値が不正です。data-h5-contextの場合はオブジェクト、data-h5-loop-contextの場合は配列を指定してください。';
	addFwErrorCodeMap(errMsgMap);
	/* del end */

	// =========================================================================
	//
	// Cache
	//
	// =========================================================================
	// =========================================================================
	//
	// Privates
	//
	// =========================================================================
	// =============================
	// Variables
	// =============================
	var contextUid = 0;

	/** viewUidカウンタ */
	var viewUid = 0;

	/** bindUidカウンタ */
	var bindRootId = 0;

	/** グローバルなbindRootIdからBindingインスタンスへのマップ */
	var bindRootIdToBindingMap = {};

	//MEMO バインド関係のマップのたどり方
	//(1)ソース -> 特定のビュー： srcToViewMap[srcIndex][viewUid] がビュー。
	//  srcIndexはbinding._usingContexts配列のソースオブジェクトのインデックス位置。
	//  srcToViewMap[i][j]の中身はノードの配列。
	//(2)特定のビュー -> ソース： viewUid経由でたどれる。viewToSrcMap[viewUid] がソースオブジェクト。
	//  ビュー -> ソースはbindingインスタンス単位ではなく、グローバルに管理（ビュー自体が実質シングルトンなので）。
	//(3)loop-contextの各要素と対応する（要素ごとの）ビュー：
	//  binding._loopElementsMap[viewUid] = loopElementsArray;
	//  loopElementsArrayのi番目にはビューのノードの配列が入っていて、ソース配列のi番目と対応。


	/**
	 * ビュー（viewUid） -> ソースオブジェクト のマップ。many:1。キーはviewUid、値はソースオブジェクト。
	 */
	var viewToSrcMap = {};

	// =============================
	// Functions
	// =============================

	var cloneNodeDeeply;
	(function() {
		var cloneTest = document.createElement('div');
		cloneTest.h5Dummy = 'a';
		var cloned = cloneTest.cloneNode(false);
		var useOuterHtmlClone = (cloned.h5Dummy !== undefined);
		cloneTest.h5Dummy = undefined;

		if (useOuterHtmlClone) {
			cloned.h5Dummy = undefined;

			//IE7の場合、cloneNodeでノードを複製すると、$().find()でクローンした要素を取得できなくなる場合があった（詳細な原因は不明）。
			//また、IE8以下、またはIE9でもDocModeが8以下の場合、ノードに付加したJSプロパティやattachEventのイベントがクローン先にもコピーされてしまう。
			//そのため、cloneNode()した結果JSプロパティがコピーされる環境（== DocMode<=8の環境、を想定）では
			//エレメントのコピーはouterHTMLを基にjQueryによるノード"生成"で行う（!= クローン）ようにしている。
			cloneNodeDeeply = function(srcNode) {
				if (srcNode.nodeType === NODE_TYPE_ELEMENT) {
					//IE8以下で<li>等のouterHTMLを取得するとタグの前に改行が入る場合がある
					//（<li>タグの前の空白文字が改行になる模様）
					return $($.trim(srcNode.outerHTML))[0];
				}
				return srcNode.cloneNode(true);
			};
		} else {
			//その他のブラウザでは、cloneNodeを使ってノードをクローンする。cloneNodeの方が、通常パフォーマンスは良いため。
			cloneNodeDeeply = function(srcNode) {
				return srcNode.cloneNode(true);
			};
		}
	})();


	function getElemAttribute(node, attr) {
		if (!node || node.nodeType !== NODE_TYPE_ELEMENT) {
			return undefined;
		}
		return node.getAttribute(attr);
	}

	function setElemAttribute(node, attr, value) {
		node.setAttribute(attr, value);
	}

	function removeElemAttribute(node, attr) {
		node.removeAttribute(attr);
	}

	function toArray(pseudoArray) {
		if (!pseudoArray) {
			return null;
		}

		var ret = [];
		for ( var i = 0, len = pseudoArray.length; i < len; i++) {
			ret.push(pseudoArray[i]);
		}
		return ret;
	}

	function getSrcFromView(viewUid) {
		return viewToSrcMap[viewUid];
	}

	/**
	 * viewUidを返す。返される値は、1回のFWの生存期間中一意。（リロードされるとリセット）
	 */
	function getViewUid() {
		return viewUid++;
	}


	function queryQualifiedElements(rootNode, attrs, value, includeRoot) {
		var ret = [];

		var attrArray = wrapInArray(attrs);

		if (includeRoot === true) {
			//ルートノードを含める場合は、自分をルートとして再帰
			queryQualifiedElementsInner(ret, rootNode, attrArray, value);
			return ret;
		}

		//ルートノードを含めない場合は、子要素をそれぞれルートにして処理
		var childNodes = rootNode.childNodes;
		for ( var i = 0, len = childNodes.length; i < len; i++) {
			queryQualifiedElementsInner(ret, childNodes[i], attrArray, value);
		}
		return ret;
	}

	function queryQualifiedElementsInner(ret, rootNode, attrs, value) {
		if (rootNode.nodeType !== NODE_TYPE_ELEMENT) {
			return;
		}

		for ( var i = 0, len = attrs.length; i < len; i++) {
			var attrValue = rootNode.getAttribute(attrs[i]);
			if (value === undefined) {
				if (attrValue !== null) {
					ret.push(rootNode);
					break;
				}
			} else {
				//IE7以下では、setAttribute()でdata-*属性に数値を入れると、getAttr()したとき型がNumberになっている。
				//しかし、outerHTMLでノードをクローンした場合、data-*属性の値は文字列型になっている。
				//そのため、ここでは厳密等価ではなく通常の等価比較を行っている。
				if (attrValue !== null && attrValue == value) {
					ret.push(rootNode);
					break;
				}
			}
		}

		if (rootNode.childNodes.length > 0) {
			var childNodes = rootNode.childNodes;
			for ( var i = 0, len = childNodes.length; i < len; i++) {
				queryQualifiedElementsInner(ret, childNodes[i], attrs, value);
			}
		}
	}

	/**
	 * 別のコンテキストに属していない（＝現在のコンテキストに属している）バインド対象要素を返します。ネストしたコンテキストの中の対象要素は含まれません。
	 *
	 * @param {Node|Node[]} rootNodes ルート要素、またはルート要素の配列
	 * @returns {jQuery} 別のコンテキストに属していないバインド対象要素
	 */
	function $getBindElementsInContext(rootNodes, isMultiRoot) {
		rootNodes = wrapInArray(rootNodes);

		var bindElements = [];

		for ( var i = 0, len = rootNodes.length; i < len; i++) {
			var rootNode = rootNodes[i];

			//ルート要素がエレメントでない場合は何もしない
			if (rootNode.nodeType !== NODE_TYPE_ELEMENT) {
				continue;
			}

			//バインディングルートの場合は、
			//rootNodeは「仮想の親要素（バインドルート）」の子要素として考える必要がある。
			//ルート要素で別のコンテキストが指定されている場合はそれ以下のノードは絶対に含まれない
			if ((isMultiRoot === true)
					&& (getElemAttribute(rootNode, DATA_H5_CONTEXT) != null || getElemAttribute(
							rootNode, DATA_H5_LOOP_CONTEXT) != null)) {
				continue;
			}

			var candidateBindElems = queryQualifiedElements(rootNode, DATA_H5_BIND, undefined, true);
			for ( var j = 0, cndBindElemsLen = candidateBindElems.length; j < cndBindElemsLen; j++) {
				var isInCurrentContext = true;

				for ( var node = candidateBindElems[j]; node != null; node = node.parentNode) {
					if (node === rootNode) {
						break;
					}

					if (getElemAttribute(node, DATA_H5_CONTEXT) != null
							|| getElemAttribute(node, DATA_H5_LOOP_CONTEXT) != null) {
						isInCurrentContext = false;
						break;
					}
				}

				if (isInCurrentContext) {
					bindElements.push(candidateBindElems[j]);
				}
			}
		}

		return $(bindElements);
	}

	/**
	 * 自分のコンテキストの直接の子供であるdata-context（またはdata-loop-context）を返します。
	 */
	function $getChildContexts(rootNodes, dataContextAttr, isMultiRoot) {
		var childContexts = [];

		for ( var i = 0, len = rootNodes.length; i < len; i++) {
			var rootNode = rootNodes[i];

			//ルート要素がエレメントでない場合は別のコンテキストである可能性はない
			if (rootNode.nodeType !== NODE_TYPE_ELEMENT) {
				continue;
			}

			if (isMultiRoot === true) {
				//このrootNodesがバインディングのルートノードの場合（＝仮想的なルートノードの子要素の場合）

				//指定されたコンテキストが設定されていれば必ず直接の子供
				if (rootNode.getAttribute(dataContextAttr) != null) {
					childContexts.push(rootNode);
					continue;
				}

				//コンテキストが設定されていれば、その子孫のノードは必ず別のコンテキストに属していることになる
				if (getElemAttribute(rootNode, DATA_H5_CONTEXT) != null
						|| getElemAttribute(rootNode, DATA_H5_LOOP_CONTEXT) != null) {
					continue;
				}
			}

			var candidateContextElems = queryQualifiedElements(rootNode, dataContextAttr,
					undefined, false);
			for ( var j = 0, cndCtxElemsLen = candidateContextElems.length; j < cndCtxElemsLen; j++) {
				var contextParent = $(candidateContextElems[j]).parent(
						'[data-h5-context],[data-h5-loop-context]')[0];
				if (contextParent === undefined || contextParent === rootNode) {
					childContexts.push(candidateContextElems[j]);
				}
			}
		}

		return $(childContexts);
	}


	function isObservableItem(obj) {
		//TODO 厳密に判定
		// ObservableItemの場合もtrueを返す
		if (obj && obj.addEventListener && obj.getModel && !$.isArray(obj)
				&& !h5.core.data.isObservableArray(obj) || h5.core.data.isObservableItem(obj)) {
			return true;
		}
		return false;
	}

	function addViewUid(rootNodes, viewUid) {
		for ( var i = 0, len = rootNodes.length; i < len; i++) {
			var n = rootNodes[i];
			if (n.nodeType === NODE_TYPE_ELEMENT) {
				setElemAttribute(n, DATA_H5_DYN_VID, viewUid);
			}
		}
	}

	/**
	 * data-loop-contextによるループバインドを行う。（applyBindingの中からのみ呼ばれる）
	 *
	 * @param {Binding} binding バインディングインスタンス
	 * @param {Node|Node[]} rootNodes
	 *            データコンテキストを持つルートノード、またはルートノードの配列（テキストノードやコメントノードなどELEMENT以外が含まれる場合も有る）
	 * @param {Object} context データコンテキスト
	 */
	function applyLoopBinding(binding, rootNodes, context) {
		var viewUid = getViewUid();

		//loop-contextの場合は、ループのルートノードは必ず単一のノード
		var loopRootElement = rootNodes[0];

		//ループ前に一旦内部要素をすべて外す
		$(loopRootElement).empty();

		if (!context) {
			//contextがない場合はループを一切行わない（BindingEntryもつけない）
			return;
		}

		if (!($.isArray(context) || h5.core.data.isObservableArray(context))) {
			//data-h5-loop-contextの場合contextは配列でなければならない
			throwFwError(ERR_CODE_INVALID_CONTEXT_SRC);
		}

		addViewUid(rootNodes, viewUid);

		binding._addBindingEntry(context, loopRootElement, viewUid);

		if (h5.core.data.isObservableArray(context) && !binding._isWatching(context)) {
			var changeListener = function(event) {
				binding._observableArray_changeListener(event);
			};
			binding._listeners[binding._getContextIndex(context)] = changeListener;

			context.addEventListener('change', changeListener);
		}

		//ループルートノードに対応する子ノードリストを、保存しているビューソースから取り出す
		var loopDynCtxId = getElemAttribute(loopRootElement, DATA_H5_DYN_CTX);
		var srcRootChildNodes = toArray(binding._getSrcCtxNode(loopDynCtxId).childNodes);

		//このループコンテキストの各要素に対応するノード（配列）を格納する配列
		var loopElementsArray = [];
		binding._loopElementsMap[viewUid] = loopElementsArray;

		//appendChildの呼び出し回数削減。
		//ループ単位ごとにappendChildしてdocumentにバインドする（＝Fragmentは都度空になる）ので、使いまわしている。
		var fragment = document.createDocumentFragment();

		var getContextElement = context.get ? function(idx) {
			return context.get(idx);
		} : function(idx) {
			return context[idx];
		};

		for ( var i = 0, len = context.length; i < len; i++) {
			var loopNodes = [];

			//1要素分のノードのクローンを作成
			for ( var j = 0, childLen = srcRootChildNodes.length; j < childLen; j++) {
				var clonedInnerNode = cloneNodeDeeply(srcRootChildNodes[j]); //deep copy

				loopNodes.push(clonedInnerNode);

				fragment.appendChild(clonedInnerNode);
			}

			//配列1要素分のノードリストを保存
			loopElementsArray[i] = loopNodes;

			//IE6で、documentツリーにぶら下がっていない状態で属性操作を行うとそれが反映されない場合がある
			//（例えばinput-checkboxのcheckedを操作してもそれが反映されない）
			//そのため、先にツリーにappendしてからバインディングを行う
			loopRootElement.appendChild(fragment);

			//配列1要素分のバインディングを実行
			applyBinding(binding, loopNodes, getContextElement(i), false, true);
		}
	}

	/**
	 * データバインドを行う。context単位にsrc/viewの対応を保存。可能ならイベントハンドラを設定して、変更伝搬させる
	 *
	 * @param {Binding} binding バインディングインスタンス
	 * @param {Node|Node[]} rootNodes
	 *            データコンテキストを持つルートノード、またはルートノードの配列（テキストノードやコメントノードなどELEMENT以外が含まれる場合も有る）
	 * @param {Object} context データコンテキスト
	 * @param {Boolean} isLoopContext ループコンテキストかどうか
	 */
	function applyBinding(binding, rootNodes, context, isLoopContext, isMultiRoot) {
		//配列化（要素が直接来た場合のため）
		rootNodes = wrapInArray(rootNodes);

		if (isLoopContext) {
			//loop-contextの場合はループ用の処理を行う
			//loop-contextの場合、ルートノードは必ず単一の要素
			applyLoopBinding(binding, rootNodes, context);
			return;
		}

		//以下はloop-contextでない場合

		var viewUid = getViewUid();

		if (context) {
			//TODO loop-contextにおいて個々のループ単位のコンテキスト自身をcontextやloop-contextにバインドする方法を追加した場合
			//ここのチェックルーチンは変更になる
			if (typeof context !== 'object' || $.isArray(context)
					|| h5.core.data.isObservableArray(context)) {
				//data-h5-contextの場合contextはオブジェクトでなければならない（配列は不可）
				throwFwError(ERR_CODE_INVALID_CONTEXT_SRC);
			}

			//コンテキストが存在する場合
			//エレメントについては、ビュー->ソースをすぐにひけるようdata属性でviewUidを付加しておく
			addViewUid(rootNodes, viewUid);

			binding._addBindingEntry(context, rootNodes, viewUid);
		}
		//context===nullの場合に子要素のバインディングを解除する必要はない。
		//現状の実装では、初回はバインディングはまだ行われておらず、
		//2回目以降Itemのpropが変わった場合などで再バインドされるときは
		//バインドされていないオリジナルに対してバインドが再実行されるので、
		//「バインド済みのものに対して別のコンテキストを割り当てる」ことはない。

		var isItem = isObservableItem(context);

		if (isItem && !binding._isWatching(context)) {
			//まだこのバインディングが監視していないオブジェクトの場合は監視を始める。
			//ソースデータコンテキストから対応するすべてのビューを知ることができるので、
			//ハンドラは1アイテムにつき1つバインドすれば十分。
			var changeListener = function(event) {
				binding._observableItem_changeListener(event);
			};
			binding._listeners[binding._getContextIndex(context)] = changeListener;

			context.addEventListener('change', changeListener);
		}

		//自分のコンテキストに属しているバインディング対象要素を探す
		//（rootElement自体がバインド対象になっている場合もある）
		var $bindElements = $getBindElementsInContext(rootNodes, isMultiRoot);

		//自コンテキストに属する各要素のデータバインドを実行
		$bindElements.each(function() {
			doBind(this, context, isItem);
		});

		//ネストした子data-context, data-loop-contextのデータバインドを実行
		applyChildBinding(binding, rootNodes, context, false, isMultiRoot);
		applyChildBinding(binding, rootNodes, context, true, isMultiRoot);
	}

	function applyChildBinding(binding, rootNodes, context, isLoopContext, isMultiRoot) {
		var dataContextAttr = isLoopContext ? 'data-h5-loop-context' : 'data-h5-context';

		//自分のコンテキストに属するdata-contextを探す
		var $childContexts = $getChildContexts(rootNodes, dataContextAttr, isMultiRoot);

		//内部コンテキストについてapplyBindingを再帰的に行う
		$childContexts.each(function() {
			var childContextProp = getElemAttribute(this, dataContextAttr);
			//contextがisObservableItemならgetでchildContextを取得する
			//TODO getContextValue()などで統一するか
			var childContext = null;
			if (context) {
				childContext = isObservableItem(context) ? context.get(childContextProp)
						: context[childContextProp];
			}

			applyBinding(binding, this, childContext, isLoopContext);
		});
	}

	/**
	 * データバインドの指定（data-bind属性の値）をパースします。
	 *
	 * @param {String} bindDesc バインド指定（data-bind属性の値）
	 * @returns {Object} パース済みのバインド指定
	 */
	function parseBindDesc(bindDesc) {
		var splitDescs = bindDesc.split(BIND_DESC_SEPARATOR);
		var target = [];
		var targetDetail = [];
		var prop = [];

		for ( var i = 0, len = splitDescs.length; i < len; i++) {
			var desc = splitDescs[i];
			if (desc.indexOf(BIND_DESC_TARGET_SEPARATOR) === -1) {
				var trimmed = $.trim(desc);
				if (trimmed.length > 0) {
					//ターゲット指定がない＝自動バインドの場合
					target.push(null);
					targetDetail.push(null);
					prop.push($.trim(desc));
				}
			} else {
				var sd = desc.split(BIND_DESC_TARGET_SEPARATOR);
				var trimmedTarget = $.trim(sd[0]);
				var trimmedProp = $.trim(sd[1]);

				var trimmedDetail = null;
				var detail = BIND_TARGET_DETAIL_REGEXP.exec(trimmedTarget);
				if (detail) {
					//attr(color) -> attr, colorに分離してそれぞれ格納
					trimmedDetail = detail[1];
					trimmedTarget = /(\S+)[\s\(]/.exec(trimmedTarget)[1];
				}

				if (trimmedTarget.length > 0 && trimmedProp.length > 0) {
					target.push(trimmedTarget);
					targetDetail.push(trimmedDetail);
					prop.push(trimmedProp);
				}
			}

		}

		var ret = {
			t: target,
			d: targetDetail,
			p: prop
		};
		return ret;
	}


	/**
	 * 指定されたエレメントに対して、data-bindで指示された方法で値をセットします。
	 */
	function doBind(element, context, isItem) {
		var bindDesc = parseBindDesc(getElemAttribute(element, DATA_H5_BIND));
		var targets = bindDesc.t;
		var details = bindDesc.d;
		var props = bindDesc.p;

		var $element = $(element);

		//targetsとpropsのlengthは必ず同じ
		for ( var i = 0, len = targets.length; i < len; i++) {
			var target = targets[i];
			var detail = details[i];
			var prop = props[i];

			var value = null;
			if (context) {
				//contextが存在する場合は値を取得。（contextがnullの場合は初期化を行う）
				if (isItem) {
					value = context.get(prop);
				} else {
					value = context[prop];
				}
			}

			if (target == null) {
				//自動指定は、inputタグならvalue属性、それ以外ならテキストノードをターゲットとする
				if (element.tagName.toLowerCase() === 'input') {
					target = 'attr';
					detail = 'value';
				} else {
					target = 'text';
				}
			}

			switch (target) {
			case 'text':
				value == null ? $element.text('') : $element.text(value);
				break;
			case 'html':
				value == null ? $element.html('') : $element.html(value);
				break;
			case 'class':
				var origClassName = getElemAttribute(element, DATA_H5_DYN_CN);
				var isOrigClassEmpty = origClassName == null;
				var space = isOrigClassEmpty ? '' : ' ';

				var allowPutValue = false;
				if (value) {
					//バインドするクラス名がすでに初期状態のclassに書かれている場合は二重にセットしないようにする
					var classTester = new RegExp('\\s' + value + '\\s');
					//クラスが１つしか書いていない場合もあるので、正規表現でチェックしやすいよう前後にスペースを付けてチェック
					allowPutValue = !classTester.test(' ' + origClassName + ' ');
				}

				//初期状態のclassもバインドの値も空の場合は
				//jQueryのremoveClass()に倣って空文字を代入してclassをクリアする
				$element[0].className = (isOrigClassEmpty ? '' : origClassName)
						+ (allowPutValue ? space + value : '');
				break;
			case 'attr':
				if (!detail) {
					throwFwError(ERR_CODE_REQUIRE_DETAIL);
				}
				//ここのremoveAttr(), attr()はユーザーによる属性操作なので、jQueryのattr APIを使う
				value == null ? $element.removeAttr(detail) : $element.attr(detail, value);
				break;
			case 'style':
				if (!detail) {
					throwFwError(ERR_CODE_REQUIRE_DETAIL);
				}
				//contextがnullの場合valueはnull。styleはcontext===nullの場合当該スタイルを削除するので
				//このコードでスタイルが削除される（よってcontextによる分岐は不要）。
				value == null ? $element.css(detail, '') : $element.css(detail, value);
				break;
			default:
				throwFwError(ERR_CODE_UNKNOWN_BIND_DIRECTION);
			}
		}
	}

	/**
	 * 指定されたノードをDOMツリーから削除し、同時にアンバインドします。
	 */
	function removeDomNodes(binding, parent, nodesToRemove) {
		for ( var i = 0, len = nodesToRemove.length; i < len; i++) {
			var n = nodesToRemove[i];
			parent.removeChild(n);
			binding._removeBinding(n);
		}
	}

	function cloneChildNodes(parentNode) {
		var childNodes = parentNode.childNodes;
		var ret = [];

		for ( var i = 0, len = childNodes.length; i < len; i++) {
			ret.push(cloneNodeDeeply(childNodes[i]));
		}

		return ret;
	}

	function addLoopChildren(binding, loopElements, srcCtxRootNode, method, methodArgs) {
		//追加される全てのノードを持つフラグメント。
		//Element.insertBeforeでフラグメントを挿入対象にすると、フラグメントに入っているノードの順序を保って
		//指定した要素の前に挿入できる。従って、unshift()の際insertBeforeを一度呼ぶだけで済む。
		var fragment = document.createDocumentFragment();

		var newLoopNodes = [];
		for ( var i = 0, argsLen = methodArgs.length; i < argsLen; i++) {
			var newChildNodes = cloneChildNodes(srcCtxRootNode);
			newLoopNodes[i] = newChildNodes;

			for ( var j = 0, newChildNodesLen = newChildNodes.length; j < newChildNodesLen; j++) {
				fragment.appendChild(newChildNodes[j]);
			}

			applyBinding(binding, newChildNodes, methodArgs[i]);
		}
		Array.prototype[method].apply(loopElements, newLoopNodes);

		return fragment;
	}

	/**
	 * 配列のビューをリバースします。loopNodesはリバース前の配列であることを前提とします。<br>
	 */
	function reverseLoopNodes(parent, loopNodes) {
		//一旦すべてのノードをparentから外す
		while (parent.firstChild) {
			parent.removeChild(parent.firstChild);
		}

		//配列要素をリバースしたのと同等になるようにノードを再挿入する
		for ( var i = 0, len = loopNodes.length; i < len; i++) {
			var nodesPerIndex = loopNodes[i];
			for ( var j = nodesPerIndex.length - 1; j >= 0; j--) {
				parent.insertBefore(nodesPerIndex[j], parent.firstChild);
			}
		}
	}

	function spliceLoopNodes(binding, parent, srcArray, methodArgs, loopNodes, srcCtxRootNode) {
		var methodArgsLen = methodArgs.length;

		if (methodArgsLen === 0) {
			return;
		}

		var startPos = methodArgs[0];

		var removePos = startPos;

		var removeEnd;
		if (methodArgsLen === 1) {
			//spliceの第2引数省略時は、start以降すべての要素を削除
			removeEnd = srcArray.length;
		} else {
			//spliceの第2引数は削除する個数
			removeEnd = removePos + methodArgs[1];
		}

		//指定されたインデックスに対応するDOMノードを削除
		for (; removePos < removeEnd; removePos++) {
			var nodesPerIndex = loopNodes[removePos];
			//配列がスパースである場合やsplice()で実際の要素数以上の個数を削除しようとしている場合、
			//ループノードがない場合が考えられるのでチェックする
			if (nodesPerIndex) {
				removeDomNodes(binding, parent, nodesPerIndex);
			}
		}

		//まず、削除のみを行う
		loopNodes.splice(startPos, methodArgs[1]);

		if (methodArgsLen <= 2) {
			//追加する要素がなければ削除だけ行って終了
			return;
		}

		var insertionMarkerNode;

		var loopNodesLen = loopNodes.length;
		if (loopNodesLen === 0 || startPos === 0) {
			//全ての要素が削除された場合、またはstartが0の場合は先頭に追加する
			//全要素が削除されている場合firstChildはnullになっているはず
			insertionMarkerNode = parent.firstChild;
		} else if (startPos >= loopNodesLen) {
			//startPosがloopNodesの長さより大きい場合はノードは末尾に挿入
			//insertBefore()は、挿入位置がnullの場合は末尾挿入
			insertionMarkerNode = null;
		} else {
			//要素が残っている場合は、startの前に追加する
			insertionMarkerNode = loopNodes[startPos][0];
		}

		//以下は要素の挿入がある場合
		//spliceの挙動(on Chrome22)：
		//・startがlengthを超えている場合：要素の削除は起こらない、要素は末尾に挿入される、lengthは挿入した分だけ（startで指定したインデックスに入るわけではない）
		//・countが省略された場合：start以降の全要素を削除
		//・countがlengthを超えている場合：start以降の全要素が削除される
		//・挿入要素がある場合：startの位置にinsertBefore（startがlengthを超えている場合は末尾に挿入）

		var fragment = document.createDocumentFragment();

		//loopNodesに対するspliceのパラメータ。要素の挿入を行うため、あらかじめstartPosと削除数0を入れておく
		var spliceArgs = [startPos, 0];

		//新たに挿入される要素に対応するノードを生成
		for ( var i = 2, len = methodArgsLen; i < len; i++) {
			var newChildNodes = cloneChildNodes(srcCtxRootNode);

			for ( var j = 0, newChildNodesLen = newChildNodes.length; j < newChildNodesLen; j++) {
				fragment.appendChild(newChildNodes[j]);
			}

			applyBinding(binding, newChildNodes, methodArgs[i]);
			spliceArgs.push(newChildNodes);
		}

		//DOMツリーの該当位置にノードを追加
		parent.insertBefore(fragment, insertionMarkerNode);

		//指定された位置に要素を挿入する
		Array.prototype.splice.apply(loopNodes, spliceArgs);
	}

	/**
	 * 指定されたループコンテキスト以下のDOMツリーを再構築します。既存のDOMノードは削除されます。
	 * このメソッドはObservableArrayの更新時のみ呼び出されることを想定しています。
	 */
	function refreshLoopContext(binding, srcArray, loopRootNode, loopNodes, srcCtxNode) {
		//現在のビューのすべての要素を外す
		for ( var i = 0, len = loopNodes.length; i < len; i++) {
			removeDomNodes(binding, loopRootNode, loopNodes[i]);
		}

		//TODO addLoopChildrenとコード共通化

		//追加される全てのノードを持つフラグメント。
		//Element.insertBeforeでフラグメントを挿入対象にすると、フラグメントに入っているノードの順序を保って
		//指定した要素の前に挿入できる。従って、unshift()の際insertBeforeを一度呼ぶだけで済む。
		var fragment = document.createDocumentFragment();

		var newLoopNodes = [];
		for ( var i = 0, srcLen = srcArray.length; i < srcLen; i++) {
			var newChildNodes = cloneChildNodes(srcCtxNode);
			newLoopNodes[i] = newChildNodes;

			for ( var j = 0, newChildNodesLen = newChildNodes.length; j < newChildNodesLen; j++) {
				fragment.appendChild(newChildNodes[j]);
			}

			applyBinding(binding, newChildNodes, srcArray.get(i));
		}

		loopRootNode.appendChild(fragment);

		return newLoopNodes;
	}

	// =========================================================================
	//
	// Body
	//
	// =========================================================================

	function Binding__observableArray_changeListener(event) {
		var views = this._getViewsFromSrc(event.target);
		if (!views) {
			return;
		}

		//(3)loop-contextの各要素と対応する（要素ごとの）ビュー：
		//binding._loopElementsMap[viewUid] = loopElementsArray;
		//loopElementsArrayのi番目にはビューのノードの配列が入っていて、ソース配列のi番目と対応。


		for ( var viewUid in views) {
			if (!views.hasOwnProperty(viewUid)) {
				continue;
			}

			var loopRootNode = views[viewUid];

			var srcCtxNode = this._getSrcCtxNode(getElemAttribute(loopRootNode, DATA_H5_DYN_CTX));

			var loopNodes = this._loopElementsMap[viewUid];

			switch (event.method) {
			case 'set':
				console.log(event);
				spliceLoopNodes(this, loopRootNode, event.target,
						[event.args[0], 1, event.args[1]], loopNodes, srcCtxNode);
				break;
			case 'shift':
			case 'pop':
				var nodesToRemove = loopNodes[event.method]();
				if (nodesToRemove) {
					//要素数0の配列に対してshift,popすると戻り値はundefined
					removeDomNodes(this, loopRootNode, nodesToRemove);
				}
				break;
			case 'unshift':
				var fragment = addLoopChildren(this, loopNodes, srcCtxNode, event.method,
						event.args);
				//新規追加ノードを先頭に追加
				loopRootNode.insertBefore(fragment, loopRootNode.firstChild);
				break;
			case 'push':
				var fragment = addLoopChildren(this, loopNodes, srcCtxNode, event.method,
						event.args);
				//新規追加ノードを末尾に追加
				loopRootNode.appendChild(fragment);
				break;
			case 'splice':
				spliceLoopNodes(this, loopRootNode, event.target, event.args, loopNodes, srcCtxNode);
				break;
			case 'reverse':
				//DOMツリー側をリバース
				reverseLoopNodes(loopRootNode, loopNodes);
				//保持している配列をリバース
				loopNodes.reverse();
				break;
			case 'sort':
			case 'copyFrom':
				//ループビューをすべて作り直す
				this._loopElementsMap[viewUid] = refreshLoopContext(this, event.target,
						loopRootNode, loopNodes, srcCtxNode);
				break;
			}
		}
	}

	function hasClassBinding(bindDesc) {
		return /class\s*:/.test(bindDesc);
	}

	/**
	 * バインディングを管理します。
	 *
	 * @private
	 * @name Binding
	 * @class
	 */
	function Binding(target, dataContext) {
		if (target.nodeType !== undefined) {
			if (target.nodeType === NODE_TYPE_ELEMENT) {
				//エレメントノード

				//バインドターゲットの親要素
				this._parent = target.parentNode;

				this._targets = [target];
			}
		} else {
			//複数のノード

			/**
			 * バインドターゲットの親要素
			 *
			 * @name _parent
			 * @private
			 */
			this._parent = target[0].parentNode;
			/**
			 * バインドターゲット
			 *
			 * @name _targets
			 * @private
			 */
			this._targets = toArray(target);
		}

		/**
		 * このバインディングのID
		 *
		 * @name _bindRootId
		 * @private
		 */
		this._bindRootId = bindRootId++;

		//マップにこのインスタンスを登録
		bindRootIdToBindingMap[this._bindRootId] = this;

		var clonedSrc = [];

		//this._targetsは常に配列
		//初期状態のビューに、コンテキストごとに固有のIDを振っておく
		for ( var i = 0, targetsLen = this._targets.length; i < targetsLen; i++) {
			var originalNode = this._targets[i];

			if (originalNode.nodeType === NODE_TYPE_ELEMENT) {
				//ルートのエレメントノードにdata-dyn-bind-rootを付与して、このBindingインスタンスを探せるようにしておく
				setElemAttribute(originalNode, DATA_H5_DYN_BIND_ROOT, this._bindRootId);

				//data-context, data-loop-contextを持つ要素にIDを付与して、オリジナルの要素を探せるようにする
				var originalContextElems = queryQualifiedElements(originalNode, [DATA_H5_CONTEXT,
						DATA_H5_LOOP_CONTEXT], undefined, true);
				for ( var j = 0, orgCtxElemsLen = originalContextElems.length; j < orgCtxElemsLen; j++) {
					setElemAttribute(originalContextElems[j], DATA_H5_DYN_CTX, contextUid++);
				}

				//data-h5-bindでclassバインドしている場合、オリジナルのclassNameを保存しておく（記述されている場合のみ）
				var originalBindElems = queryQualifiedElements(originalNode, DATA_H5_BIND,
						undefined, true);
				for ( var j = 0, orgBindElemsLen = originalBindElems.length; j < orgBindElemsLen; j++) {
					var originalBindElem = originalBindElems[j];
					if (hasClassBinding(getElemAttribute(originalBindElem, DATA_H5_BIND))
							&& originalBindElem.className != '') {
						setElemAttribute(originalBindElem, DATA_H5_DYN_CN,
								originalBindElem.className);
					}
				}
			}

			//保存用にクローン
			clonedSrc.push(originalNode.cloneNode(true));
		}

		/**
		 * クローンした初期状態のテンプレート
		 *
		 * @name _srces
		 * @private
		 */
		this._srces = clonedSrc;

		/**
		 * loop-contextの各インデックスがもつ要素（配列）を保持。 キー：viewUid、値：配列の配列。
		 * 値は、「あるviewUidのloop-contextのi番目（＝ここが1段目）の要素の配列（＝2段目）」になっている。
		 *
		 * @name _loopElementsMap
		 * @private
		 */
		this._loopElementsMap = {};

		/**
		 * このバインディングのルートデータコンテキスト
		 *
		 * @name _rootContext
		 * @private
		 */
		this._rootContext = dataContext;

		/**
		 * 現在適用中のデータコンテキストを入れる配列。同じインスタンスは1つしか入らない。 この配列のインデックスをキーにしてビューを探す<br>
		 * TODO インデックスをキーとして使うため、使用しなくなったオブジェクトの場所にはnullが入り、次第にスパースな配列になってしまう。<br>
		 * 二重ポインタのようにして管理すればよいが、パフォーマンスに重大な影響が出るほどスパースになることはまれと考え、Deferredする。
		 *
		 * @name _usingContexts
		 * @private
		 */
		this._usingContexts = [];

		/**
		 * ソースオブジェクト -> ビュー のマップ。1:many。 キーは_usingContextsのインデックス。 値はさらにマップで、キー：viewUid,
		 * 値：ビューインスタンス（配列）。
		 *
		 * @name _srcToViewMap
		 * @private
		 */
		this._srcToViewMap = {};

		/**
		 * バインドUID（現在表示されているDOM）にひもづけているリスナー。キー：contextIndex, 値：リスナー関数
		 *
		 * @name _listeners
		 * @private
		 */
		this._listeners = {};

		//TODO ルートが配列（LoopContext）の場合を考える
		//バインディングの初期実行
		applyBinding(this, this._targets, this._rootContext, false, true);
	}
	$.extend(Binding.prototype, {
		/**
		 * このデータバインドを解除します。解除後は、ソースオブジェクトを変更してもビューには反映されません。<br>
		 * ビュー（HTML）の状態は、このメソッドを呼んだ時の状態のままです。
		 *
		 * @since 1.1.0
		 * @memberOf Binding
		 * @function
		 */
		unbind: function() {
			//全てのバインディングを解除
			for ( var i = 0, len = this._targets.length; i < len; i++) {
				var target = this._targets[i];

				if (target.nodeType === NODE_TYPE_ELEMENT) {
					//バインディングを解除
					this._removeBinding(target);

					//dyn属性削除
					removeElemAttribute(target, DATA_H5_DYN_BIND_ROOT);

					var cnElems = queryQualifiedElements(target, DATA_H5_DYN_CN, undefined, true);
					for ( var j = 0, cnLen = cnElems.length; j < cnLen; j++) {
						removeElemAttribute(cnElems[j], DATA_H5_DYN_CN);
					}

					var cxElems = queryQualifiedElements(target, DATA_H5_DYN_CTX, undefined, true);
					for ( var j = 0, cxLen = cxElems.length; j < cxLen; j++) {
						removeElemAttribute(cxElems[j], DATA_H5_DYN_CTX);
					}
				}
			}

			//ビューとこのBindingインスタンスのマップを削除
			delete bindRootIdToBindingMap[this._bindRootId];

			//TODO リソース解放
			//unbindしたら、ノードは元に戻す？？
		},

		/*
		 * バインディングを再実行します。既存のビューは一度すべて削除されます。
		 *
		 * @since 1.1.0
		 * @memberOf Binding
		 * @function
		 * @private
		 */
		//		refresh: function() {
		//			//保存しておいたビューをクローン
		//			var fragment = document.createDocumentFragment();
		//			for ( var i = 0, len = this._srces.length; i < len; i++) {
		//				fragment.appendChild(this._srces[i].cloneNode(true));
		//			}
		//
		//			//fragmentをappendする前にノードリストをコピーしておく
		//			var newTargets = toArray(fragment.childNodes);
		//
		//			//新しいターゲットに対してバインディングを実行
		//			//TODO ルートが配列（LoopContext）の場合を考える
		//			applyBinding(this, newTargets, this._rootContext, false, true);
		//
		//			//生成したノードを今のターゲット（の最初のノード）の直前に追加して
		//			this._parent.insertBefore(fragment, this._targets[0]);
		//
		//			//既存のターゲットを削除
		//			for ( var i = 0, len = this._targets.length; i < len; i++) {
		//				this._removeBinding(this._targets[i]);
		//				this._parent.removeChild(this._targets[i]);
		//			}
		//
		//			//ターゲットのポインタを更新
		//			this._targets = newTargets;
		//		},
		/**
		 * ObservableArrayの変更に基づいて、自分が管理するビューを更新します。<br>
		 * MEMO フォーマッタが過剰にインデントしてしまうので分離している
		 *
		 * @since 1.1.0
		 * @memberOf Binding
		 * @private
		 * @function
		 * @param event
		 */
		_observableArray_changeListener: Binding__observableArray_changeListener,

		/**
		 * データアイテムまたはObservableItemのchangeイベントハンドラ
		 *
		 * @since 1.1.0
		 * @memberOf Binding
		 * @private
		 * @function
		 * @param event
		 */
		_observableItem_changeListener: function(event) {
			var views = this._getViewsFromSrc(event.target);
			if (!views) {
				return;
			}

			//このオブジェクトがルートコンテキストかどうか。
			//ルートコンテキストの場合、$getBindElementsInContext()において
			//対応するビューは「仮想ルート要素の子要素」としてみる必要がある。
			var isRootContext = false;
			if (event.target === this._rootContext) {
				isRootContext = true;
			}

			var that = this;

			for ( var vuid in views) {
				if (!views.hasOwnProperty(vuid)) {
					continue;
				}

				//viewはこのObservableItemにバインドされているノード配列
				var view = views[vuid];

				//自分のコンテキストに属しているバインディング対象要素を探す
				var $bindElements = $getBindElementsInContext(view, isRootContext);

				//各要素についてバインドする
				$bindElements.each(function() {
					doBind(this, event.target, true);
				});

				//自分の直接の子供のコンテキスト要素を探す
				var $childContexts = $getChildContexts(view, DATA_H5_CONTEXT);
				$childContexts.each(function() {
					var contextProp = getElemAttribute(this, DATA_H5_CONTEXT);

					if (!(contextProp in event.props)) {
						//このコンテキスト要素に対応するソースオブジェクトは変更されていない
						return true;
					}

					//子供のコンテキストの場合、仕様上あるコンテキストのルート要素は必ず単一のエレメントである

					//現在のバインディングを解除
					that._removeBinding(this);

					//対応するビューを保存してあるビューからクローンする
					var dynCtxId = getElemAttribute(this, DATA_H5_DYN_CTX);
					var srcCtxRootNode = that._getSrcCtxNode(dynCtxId);
					var cloned = cloneNodeDeeply(srcCtxRootNode);

					//新しくバインドした要素を追加し、古いビューを削除
					//(IE6は先に要素をdocumentツリーに追加しておかないと属性の変更が反映されないので先にツリーに追加)
					this.parentNode.replaceChild(cloned, this);

					//新しいコンテキストソースオブジェクトでバインディングを行う
					applyBinding(that, cloned, event.props[contextProp].newValue);
				});

				//自分の直接の子供のループルートコンテキスト要素を探す
				var $childLoopContexts = $getChildContexts(view, DATA_H5_LOOP_CONTEXT);
				$childLoopContexts.each(function() {
					var contextProp = getElemAttribute(this, DATA_H5_LOOP_CONTEXT);

					if (!(contextProp in event.props) || event.target._isArrayProp(contextProp)) {
						//このループルートコンテキスト要素に対応するソースオブジェクトは変更されていない
						//または指定されたプロパティはtype:[]なので無視
						//（ObsArrayのハンドラで処理すればよい）
						return true;
					}

					//子供のコンテキストの場合、仕様上あるコンテキストのルート要素は必ず単一のエレメントである

					//現在のバインディングを解除
					that._removeBinding(this);

					//新しいコンテキストソースオブジェクトでバインディングを行う
					//ループコンテキストなので、ルートノードはそのまま使いまわす
					applyBinding(that, this, event.props[contextProp].newValue, true);
				});
			}
		},

		/**
		 * @since 1.1.0
		 * @memberOf Binding
		 * @private
		 * @function
		 * @param ctxId
		 */
		_getSrcCtxNode: function(ctxId) {
			for ( var i = 0, len = this._srces.length; i < len; i++) {
				var src = this._srces[i];

				//ルート要素にdata-dyn-ctxがついているかチェック
				if (getElemAttribute(src, DATA_H5_DYN_CTX) === ctxId) {
					return src;
				}

				var ctxElems = queryQualifiedElements(src, DATA_H5_DYN_CTX, ctxId);
				if (ctxElems.length > 0) {
					//同じctxIdを持つ要素は1つしかない
					return ctxElems[0];
				}
			}
			return null;
		},

		/**
		 * @since 1.1.0
		 * @memberOf Binding
		 * @private
		 * @function
		 * @param ctx
		 */
		_isWatching: function(ctx) {
			var idx = this._getContextIndex(ctx);
			if (idx === -1) {
				return false;
			}
			return this._listeners[idx] != null;
		},

		/**
		 * @since 1.1.0
		 * @memberOf Binding
		 * @private
		 * @function
		 * @param ctx
		 */
		_getContextIndex: function(ctx) {
			return $.inArray(ctx, this._usingContexts);
		},

		/**
		 * ソースオブジェクト -> ビュー(配列) のマップエントリ、ビューUID -> ソースオブジェクト のマップエントリを追加。
		 * エントリが存在する場合は上書き（ただし、そもそも二重登録は想定外）。
		 *
		 * @since 1.1.0
		 * @memberOf Binding
		 * @private
		 * @function
		 * @param ctx
		 * @param view
		 * @param viewUid
		 */
		_addBindingEntry: function(src, view, viewUid) {
			var srcIndex = this._getContextIndex(src);
			if (srcIndex === -1) {
				//ソースエントリ追加
				this._usingContexts.push(src);
				srcIndex = this._usingContexts.length - 1;
			}

			viewToSrcMap[viewUid] = src;

			var srcViewMap = this._srcToViewMap[srcIndex];
			if (!srcViewMap) {
				//マップオブジェクトを新規作成し、エントリ追加
				var mapObj = {};
				mapObj[viewUid] = view;
				this._srcToViewMap[srcIndex] = mapObj;
				return;
			}
			//マップエントリ追加
			srcViewMap[viewUid] = view;
		},

		/**
		 * @since 1.1.0
		 * @memberOf Binding
		 * @private
		 * @function
		 * @param srcToViewMap
		 */
		_hasBindingForSrc: function(srcToViewMap) {
			//srcToViewMapが自分でキーを持っているということは
			//ビューへのバインディングエントリがあるということ
			for ( var key in srcToViewMap) {
				if (srcToViewMap.hasOwnProperty(key)) {
					return true;
				}
			}
			return false;
		},

		/**
		 * 特定のビューへのバインディングエントリ（ソースオブジェクト -> ビュー のマップエントリ）を削除
		 *
		 * @since 1.1.0
		 * @memberOf Binding
		 * @private
		 * @function
		 * @param viewUid
		 */
		_removeBindingEntry: function(viewUid) {
			var src = viewToSrcMap[viewUid];

			if (!src) {
				//このviewUidが表すバインディングはすでに削除されている
				return;
			}

			var ctxIndex = this._getContextIndex(src);
			if (ctxIndex !== -1) {
				var svMap = this._srcToViewMap[ctxIndex];
				if (svMap && svMap[viewUid]) {
					//ソースオブジェクト -> ビュー（viewUid経由） のマップエントリを削除
					delete svMap[viewUid];

					if (!this._hasBindingForSrc(svMap)) {
						var removed = false;
						//このオブジェクトの監視が不要（他にバインドされているビューがない）になった場合、リスナーを削除
						if (isObservableItem(src)) {
							src.removeEventListener('change', this._listeners[ctxIndex]);
							removed = true;
						} else if (h5.core.data.isObservableArray(src)) {
							src.removeEventListener('change', this._listeners[ctxIndex]);
							removed = true;
						}

						if (removed) {
							delete this._listeners[ctxIndex];
						}

						//このソースを監視する必要がなくなったので、マップそのものを削除
						delete this._srcToViewMap[ctxIndex];
					}
				}
			}

			if (viewToSrcMap[viewUid]) {
				//viewUid -> ソースオブジェクト のマップエントリを削除
				delete viewToSrcMap[viewUid];
			}
		},

		/**
		 * 指定された要素以下のバインディングを全て解除
		 *
		 * @since 1.1.0
		 * @memberOf Binding
		 * @private
		 * @function
		 * @param rootElem
		 */
		_removeBinding: function(rootElem) {
			if (rootElem.nodeType !== NODE_TYPE_ELEMENT) {
				//バインド可能なのはエレメントのみなので、ルートがELEMENTノードでない場合はバインディングはない
				return;
			}

			//渡された要素自身がviewUidを持っていたら、まずその要素のバインディングエントリを削除
			//ここでは、必ず自分自身のエントリが最初に削除されるように、queryQualifiedElementsを使わず独自に削除している
			var rootVid = getElemAttribute(rootElem, DATA_H5_DYN_VID);
			if (rootVid != null) {
				this._removeBindingEntry(rootVid);
				removeElemAttribute(rootElem, DATA_H5_DYN_VID);
			}

			//子孫要素のバインディングエントリを削除
			var vidElems = queryQualifiedElements(rootElem, DATA_H5_DYN_VID);
			for ( var i = 0, len = vidElems.length; i < len; i++) {
				var vidElem = vidElems[i];
				this._removeBindingEntry(getElemAttribute(vidElem, DATA_H5_DYN_VID));
				removeElemAttribute(vidElem, DATA_H5_DYN_VID);
			}
		},

		/**
		 * @since 1.1.0
		 * @memberOf Binding
		 * @private
		 * @function
		 * @param src
		 */
		_getViewsFromSrc: function(src) {
			var srcIndex = this._getContextIndex(src);
			if (srcIndex === -1) {
				return null;
			}
			return this._srcToViewMap[srcIndex];
		}

	});

	function createBinding(elements, context) {
		return new Binding(elements, context);
	}

	// =============================
	// Expose to window
	// =============================

	h5internal.view = {
		createBinding: createBinding
	};

})();


/* ------ h5.core.view ------ */
(function() {
	// =========================================================================
	//
	// Constants
	//
	// =========================================================================

	// =============================
	// Production
	// =============================

	/**
	 * EJSにスクリプトレットの区切りとして認識させる文字
	 */
	var DELIMITER = '[';

	// エラーコード
	/**
	 * コンパイルしようとしたテンプレートが文字列でない
	 */
	var ERR_CODE_TEMPLATE_COMPILE_NOT_STRING = 7000;

	/**
	 * テンプレートファイルの内容読み込み時に発生するエラー
	 */
	var ERR_CODE_TEMPLATE_FILE = 7001;

	/**
	 * テンプレートIDが不正である時に発生するエラー
	 */
	var ERR_CODE_TEMPLATE_INVALID_ID = 7002;

	/**
	 * テンプレートファイルの取得時に発生するエラー
	 */
	var ERR_CODE_TEMPLATE_AJAX = 7003;

	/**
	 * load()呼び出し時に引数にファイル名またはファイル名の配列が渡されなかった時に発生するエラー
	 */
	var ERR_CODE_INVALID_FILE_PATH = 7004;

	/**
	 * 登録されていないテンプレートIDを指定したときに発生するエラー
	 */
	var ERR_CODE_TEMPLATE_ID_UNAVAILABLE = 7005;

	/**
	 * テンプレートに渡すパラメータに必要なプロパティが設定されていない時に発生するエラー
	 */
	var ERR_CODE_TEMPLATE_PROPATY_UNDEFINED = 7006;

	/**
	 * bindに指定されたターゲットが不正(非DOM要素またはセレクタで指定された要素が存在しない)な場合に発生するエラー
	 */
	var ERR_CODE_BIND_INVALID_TARGET = 7007;

	/**
	 * bindに指定したtargetが表すDOM要素が複数あるならエラー
	 */
	var ERR_CODE_TOO_MANY_TARGETS = 7008;

	/**
	 * bindに指定したcontextがオブジェクトでない
	 */
	var ERR_CODE_BIND_CONTEXT_INVALID = 7009;

	/**
	 * bindに指定したcontextがオブジェクトでない
	 */
	var ERR_CODE_TEMPLATE_COMPILE_SYNTAX_ERR = 7010;

	/**
	 * テンプレートファイルにscriptタグの記述がない
	 */
	var ERR_CODE_TEMPLATE_FILE_NO_SCRIPT_ELEMENT = 7011;

	// =============================
	// Development Only
	// =============================

	var fwLogger = h5.log.createLogger('h5.core.view');

	/* del begin */
	var FW_LOG_TEMPLATE_NOT_REGISTERED = '指定されたIDのテンプレートは登録されていません。"{0}"';
	var FW_LOG_TEMPLATE_OVERWRITE = 'テンプレートID:{0} は上書きされました。';

	/**
	 * 各エラーコードに対応するメッセージ
	 */
	var errMsgMap = {};
	errMsgMap[ERR_CODE_TEMPLATE_COMPILE_NOT_STRING] = 'テンプレートのコンパイルでエラーが発生しました。テンプレートには文字列を指定してください。';
	errMsgMap[ERR_CODE_TEMPLATE_FILE] = 'テンプレートファイルが不正です。';
	errMsgMap[ERR_CODE_TEMPLATE_INVALID_ID] = 'テンプレートIDが指定されていません。空や空白でない文字列で指定してください。';
	errMsgMap[ERR_CODE_TEMPLATE_AJAX] = 'テンプレートファイルを取得できませんでした。ステータスコード:{0}, URL:{1}';
	errMsgMap[ERR_CODE_INVALID_FILE_PATH] = 'テンプレートファイルの指定が不正です。空や空白でない文字列、または文字列の配列で指定してください。';
	errMsgMap[ERR_CODE_TEMPLATE_ID_UNAVAILABLE] = 'テンプレートID:{0} テンプレートがありません。';
	errMsgMap[ERR_CODE_TEMPLATE_PROPATY_UNDEFINED] = '{0} テンプレートにパラメータが設定されていません。';
	errMsgMap[ERR_CODE_BIND_INVALID_TARGET] = 'bindの引数に指定されたターゲットが存在しないかまたは不正です。';
	errMsgMap[ERR_CODE_TOO_MANY_TARGETS] = 'bindの引数に指定されたバインド先の要素が2つ以上存在します。バインド対象は1つのみにしてください。';
	errMsgMap[ERR_CODE_BIND_CONTEXT_INVALID] = 'bindの引数に指定されたルートコンテキストが不正です。オブジェクト、データアイテム、またはObservableItemを指定してください。';
	errMsgMap[ERR_CODE_TEMPLATE_COMPILE_SYNTAX_ERR] = 'テンプレートのコンパイルでエラーが発生しました。構文エラー：{0} {1}';
	errMsgMap[ERR_CODE_TEMPLATE_FILE_NO_SCRIPT_ELEMENT] = 'テンプレートファイルに<script>タグの記述がありません。テンプレートは<script>タグで記述してください。';

	// メッセージの登録
	addFwErrorCodeMap(errMsgMap);
	/* del end */

	// =========================================================================
	//
	// Cache
	//
	// =========================================================================
	var getDeferred = h5.async.deferred;

	// =========================================================================
	//
	// Privates
	//
	// =========================================================================

	// =============================
	// Variables
	// =============================

	/**
	 * EJSテンプレート内で使用可能なヘルパー関数を格納するオブジェクト
	 */
	var helperExtras = {

		/**
		 * HTML文字列をエスケープします。
		 *
		 * @param {String} str エスケープ対象文字列
		 * @returns {String} エスケープされた文字列
		 */
		escapeHtml: function(str) {
			return h5.u.str.escapeHtml(str);
		}
	};

	/**
	 * テンプレートファイルをURL毎にキャッシュします。テンプレートファイルを取得するときに、キャッシュ済みであればアクセスしません。
	 */
	var cacheManager = {
		/**
		 * キャッシュの最大数
		 */
		MAX_CACHE: 10,

		/**
		 * URLとテンプレートオブジェクトを格納するキャッシュ
		 */
		cache: {},

		/**
		 * 現在キャッシュしているURLを保持する配列。もっとも使用されていないURLが配列の先頭にくるようソートされています。
		 */
		cacheUrls: [],

		/**
		 * 現在アクセス中のURL(絶対パス)をkeyにして、そのpromiseオブジェクトを持つ連想配列
		 */
		accessingUrls: {},

		/**
		 * コンパイル済みテンプレートオブジェクトをキャッシュします。
		 *
		 * @param {String} url URL(絶対パス)
		 * @param {Object} compiled コンパイル済みテンプレートオブジェクト
		 * @param {String} [path] 相対パス
		 */
		append: function(url, compiled, path) {
			if (this.cacheUrls.length >= this.MAX_CACHE) {
				this.deleteCache(this.cacheUrls[0]);
			}
			this.cache[url] = {};
			this.cache[url].templates = compiled;
			this.cache[url].path = path;
			this.cacheUrls.push(url);
		},

		/* del begin */
		/**
		 * テンプレートのグローバルキャッシュが保持しているURL、指定された相対パス、テンプレートIDを持ったオブジェクトを返します。 この関数は開発版でのみ利用できます。
		 *
		 * @returns {Array[Object]} グローバルキャッシュが保持しているテンプレート情報オブジェクトの配列。 [{path:(指定されたパス、相対パス),
		 *          absoluteUrl:(絶対パス), ids:(ファイルから取得したテンプレートのIDの配列)} ,...]
		 */
		getCacheInfo: function() {
			var ret = [];
			for ( var url in this.cache) {
				var obj = this.cache[url];
				var ids = [];
				for ( var id in obj.templates) {
					ids.push(id);
				}
				ret.push({
					path: obj.path,
					absoluteUrl: url,
					ids: ids
				});
			}
			return ret;
		},
		/* del end */

		/**
		 * 指定されたURLのキャッシュを削除します。
		 *
		 * @param {String} url URL
		 * @param {Boolean} isOnlyUrls trueを指定された場合、キャッシュは消さずに、キャッシュしているURLリストから引数に指定されたURLを削除します。
		 */
		deleteCache: function(url, isOnlyUrls) {
			if (!isOnlyUrls) {
				delete this.cache[url];
			}
			for ( var i = 0, len = this.cacheUrls.length; i < len; i++) {
				if (this.cacheUrls[i] === url) {
					this.cacheUrls.splice(i, 1);
					break;
				}
			}
		},

		/**
		 * 指定されたテンプレートパスからテンプレートを非同期で読み込みます。 テンプレートパスがキャッシュに存在する場合はキャッシュから読み込みます。
		 *
		 * @param {Array[String]} resourcePaths テンプレートパス
		 * @returns {Object} Promiseオブジェクト
		 */
		getTemplateByUrls: function(resourcePaths) {
			var ret = {};
			var tasks = [];
			var datas = [];

			var that = this;
			/**
			 * キャッシュからテンプレートを取得します。
			 *
			 * @param {String} url ファイルの絶対パス
			 * @returns {Object} テンプレートIDがkeyである、コンパイル済みテンプレートオブジェクトを持つオブジェクト
			 */
			var getTemplateByURL = function(url) {
				var ret = that.cache[url].templates;
				that.deleteCache(url, true);
				that.cacheUrls.push(url);
				return ret;
			};

			/**
			 * テンプレートをEJS用にコンパイルされたテンプレートに変換します。
			 *
			 * @param {jQuery} $templateElements テンプレートが記述されている要素(<script type="text/ejs">...</script>)
			 * @returns {Object}
			 *          テンプレートIDがkeyである、コンパイル済みテンプレートオブジェクトを持つオブジェクトと、テンプレートを取得したファイルパスと絶対パス(URL)を保持するオブジェクト
			 */
			function compileTemplatesByElements($templateElements) {
				if ($templateElements.length === 0) {
					return;
				}

				/**
				 * テンプレート読み込み結果オブジェクト
				 */
				var compiled = {};
				/**
				 * 読み込んだテンプレートのIDを覚えておく
				 */
				var ids = [];

				$templateElements.each(function() {
					var templateId = $.trim(this.id);
					var templateString = $.trim(this.innerHTML);

					// 空文字または空白ならエラー
					if (!templateId) {
						// load()で更にdetail対してエラー情報を追加するため、ここで空のdetailオブジェクトを生成する
						throwFwError(ERR_CODE_TEMPLATE_INVALID_ID, null, {});
					}

					try {
						var compiledTemplate = new EJS.Compiler(templateString, DELIMITER);
						compiledTemplate.compile();
						compiled[templateId] = compiledTemplate.process;
						ids.push(templateId);
					} catch (e) {
						var lineNo = e.lineNumber;
						var msg = lineNo ? ' line:' + lineNo : '';
						throwFwError(ERR_CODE_TEMPLATE_COMPILE_SYNTAX_ERR, [msg, e.message], {
							id: templateId,
							error: e,
							lineNo: lineNo
						});
					}
				});

				return {
					compiled: compiled,
					data: {
						ids: ids
					}
				};
			}

			function load(absolutePath, filePath, df) {
				h5.ajax(filePath).done(
						function(result, statusText, obj) {
							// アクセス中のURLのプロミスを保持するaccessingUrlsから、このURLのプロミスを削除する
							delete that.accessingUrls[absolutePath];

							var templateText = obj.responseText;
							// IE8以下で、テンプレート要素内にSCRIPTタグが含まれていると、jQueryが</SCRIPT>をunknownElementとして扱ってしまうため、ここで除去する
							var $elements = $(templateText).filter(
									function() {
										// nodeType:8 コメントノード
										return (this.tagName && this.tagName.indexOf('/') === -1)
												&& this.nodeType !== 8;
									});
							var filePath = this.url;

							if ($elements.not('script[type="text/ejs"]').length > 0) {
								df.reject(createRejectReason(
										ERR_CODE_TEMPLATE_FILE_NO_SCRIPT_ELEMENT, null, {
											url: absolutePath,
											path: filePath
										}));
								return;
							}

							var compileData = null;

							try {
								compileData = compileTemplatesByElements($elements
										.filter('script[type="text/ejs"]'));
							} catch (e) {
								e.detail.url = absolutePath;
								e.detail.path = filePath;
								df.reject(e);
								return;
							}

							var _ret,_data;
							try {
								var compiled = compileData.compiled;
								_data = compileData.data;
								_data.path = filePath;
								_data.absoluteUrl = absolutePath;
								_ret = compiled;
								that.append(absolutePath, compiled, filePath);
							} catch (e) {
								df.reject(createRejectReason(ERR_CODE_TEMPLATE_FILE, null, {
									error: e,
									url: absolutePath,
									path: filePath
								}));
								return;
							}

							df.resolve({
								ret: _ret,
								data: _data
							});
						}).fail(
						function(e) {
							// アクセス中のURLのプロミスを保持するaccessingUrlsから、このURLのプロミスを削除する
							delete that.accessingUrls[absolutePath];

							df.reject(createRejectReason(ERR_CODE_TEMPLATE_AJAX, [e.status,
									absolutePath], {
								url: absolutePath,
								path: filePath,
								error: e
							}));
							return;
						});
			}

			// キャッシュにあればそれを結果に格納し、なければajaxで取得する。
			for ( var i = 0; i < resourcePaths.length; i++) {
				var path = resourcePaths[i];
				var absolutePath = toAbsoluteUrl(path);

				if (this.cache[absolutePath]) {
					$.extend(ret, getTemplateByURL(absolutePath));
					datas.push({
						absoluteUrl: absolutePath
					});
					continue;
				}

				if (this.accessingUrls[absolutePath]) {
					// 現在アクセス中のURLであれば、そのpromiseを待つようにし、新たにリクエストを出さない
					tasks.push(this.accessingUrls[absolutePath]);
				} else {
					var df = h5.async.deferred();
					// IE6でファイルがキャッシュ内にある場合、load内のajaxが同期的に動くので、
					// load()の呼び出しより先にaccessingUrlsとtasksへpromiseを登録する
					tasks.push(this.accessingUrls[absolutePath] = df.promise());
					load(absolutePath, path, df);
				}
			}

			var retDf = getDeferred();

			h5.async.when(tasks).done(function() {
				var args = h5.u.obj.argsToArray(arguments);

				// loadされたものを、キャッシュから持ってきたものとマージする
				for ( var i = 0, l = args.length; i < l; i++) {
					$.extend(ret, args[i].ret);
					datas.push(args[i].data);
				}
				retDf.resolve(ret, datas);
			}).fail(function(e) {
				retDf.reject(e);
			});

			return retDf.promise();
		}
	};

	// =============================
	// Functions
	// =============================

	/**
	 * jQueryオブジェクトか判定し、jQueryオブジェクトならそのまま、そうでないならjQueryオブジェクトに変換して返します。
	 *
	 * @function
	 * @param {Object} obj DOM要素
	 * @returns {Object} jQueryObject
	 */
	function getJQueryObj(obj) {
		return h5.u.obj.isJQueryObject(obj) ? obj : $(obj);
	}


	// =========================================================================
	//
	// Body
	//
	// =========================================================================

	/**
	 * テンプレートを扱うクラス。
	 * <p>
	 * コントローラは内部にViewインスタンスを持ち、コントローラ内であればthis.viewで参照することができます。
	 * </p>
	 *
	 * @class
	 * @name View
	 */
	function View() {
		/**
		 * キャッシュしたテンプレートを保持するオブジェクト
		 *
		 * @private
		 * @name __cachedTemplates
		 * @memberOf View
		 */
		this.__cachedTemplates = {};
	}

	$.extend(View.prototype, {
		/**
		 * 指定されたパスのテンプレートファイルを非同期で読み込みキャッシュします。
		 *
		 * @memberOf View
		 * @name load
		 * @function
		 * @param {String|Array[String]} resourcePaths テンプレートファイル(.ejs)のパス (配列で複数指定可能)
		 * @returns {Promise} promiseオブジェクト
		 */
		load: function(resourcePaths) {
			var dfd = getDeferred();
			var that = this;

			var paths = null;

			// resourcePathsが文字列か配列でなかったらエラーを投げます。
			switch ($.type(resourcePaths)) {
			case 'string':
				if (!$.trim(resourcePaths)) {
					throwFwError(ERR_CODE_INVALID_FILE_PATH);
				}
				paths = [resourcePaths];
				break;
			case 'array':
				paths = resourcePaths;
				if (paths.length === 0) {
					throwFwError(ERR_CODE_INVALID_FILE_PATH);
				}
				for ( var i = 0, len = paths.length; i < len; i++) {
					if (!isString(paths[i])) {
						throwFwError(ERR_CODE_INVALID_FILE_PATH);
					} else if (!$.trim(paths[i])) {
						throwFwError(ERR_CODE_INVALID_FILE_PATH);
					}
				}
				break;
			default:
				throwFwError(ERR_CODE_INVALID_FILE_PATH);
			}

			cacheManager.getTemplateByUrls(paths).done(function(result, datas) {
				/* del begin */
				for ( var id in result) {
					if (that.__cachedTemplates[id]) {
						fwLogger.info(FW_LOG_TEMPLATE_OVERWRITE, id);
					}
				}
				/* del end */
				$.extend(that.__cachedTemplates, result);
				dfd.resolve(datas);
			}).fail(function(e) {
				fwLogger.warn(e.message);
				dfd.reject(e);
			});
			return dfd.promise();
		},

		/**
		 * Viewインスタンスに登録されている、利用可能なテンプレートのIDの配列を返します。
		 *
		 * @memberOf View
		 * @name getAvailableTemplates
		 * @function
		 * @returns {Array[String]} テンプレートIDの配列
		 */
		getAvailableTemplates: function() {
			var ids = [];
			for ( var id in this.__cachedTemplates) {
				ids.push(id);
			}
			return ids;
		},
		/**
		 * Viewインスタンスに、指定されたIDとテンプレート文字列からテンプレートを1件登録します。
		 * <p>
		 * 指定されたIDのテンプレートがすでに存在する場合は上書きします。 templateStringが不正な場合はエラーを投げます。
		 * </p>
		 *
		 * @memberOf View
		 * @name register
		 * @function
		 * @param {String} templateId テンプレートID
		 * @param {String} templateString テンプレート文字列
		 */
		register: function(templateId, templateString) {
			if ($.type(templateString) !== 'string') {
				throwFwError(ERR_CODE_TEMPLATE_COMPILE_NOT_STRING, null, {
					id: templateId
				});
			} else if (!isString(templateId) || !$.trim(templateId)) {
				throwFwError(ERR_CODE_TEMPLATE_INVALID_ID, []);
			}

			try {
				var compiledTemplate = new EJS.Compiler(templateString, DELIMITER);
				compiledTemplate.compile();
				this.__cachedTemplates[templateId] = compiledTemplate.process;
			} catch (e) {
				var lineNo = e.lineNumber;
				var msg = lineNo ? ' line:' + lineNo : '';
				throwFwError(ERR_CODE_TEMPLATE_COMPILE_SYNTAX_ERR, [msg, e.message], {
					id: templateId
				});
			}
		},

		/**
		 * テンプレート文字列が、コンパイルできるかどうかを返します。
		 *
		 * @memberOf View
		 * @name isValid
		 * @function
		 * @returns {Boolean} 第一引数に渡されたテンプレート文字列がコンパイル可能かどうか。
		 */
		isValid: function(templateString) {
			try {
				new EJS.Compiler(templateString, DELIMITER).compile();
				return true;
			} catch (e) {
				return false;
			}
		},

		/**
		 * パラメータで置換された、指定されたテンプレートIDのテンプレートを取得します。
		 * <p>
		 * 取得するテンプレート内に置換要素([%= %])が存在する場合、パラメータを全て指定してください。
		 * </p>
		 * <p>
		 * templateIdがこのViewインスタンスで利用可能でなければエラーを投げます。
		 * </p>
		 * <p> ※ ただし、コントローラが持つviewインスタンスから呼ばれた場合、templateIdが利用可能でない場合は再帰的に親コントローラをたどり、
		 * 親コントローラが持つViewインスタンスで利用可能かどうか確認します。 利用可能であれば、そのインスタンスのview.get()を実行します。
		 * </p>
		 * <p>
		 * 一番上の親のViewインスタンスまで辿ってもtemplateId利用可能でなければ場合はh5.core.view.get()を実行します。
		 * h5.core.viewでtemplateIdが利用可能でなければエラーを投げます。
		 * </p>
		 * <p>
		 * <a href="#update">update()</a>, <a href="#append">append()</a>, <a
		 * href="#prepend">prepend()</a>についても同様です。
		 * </p>
		 *
		 * @memberOf View
		 * @name get
		 * @function
		 * @param {String} templateId テンプレートID
		 * @param {Object} [param] パラメータ(オブジェクトリテラルで指定)
		 * @returns {String} テンプレート文字列
		 */
		get: function(templateId, param) {
			var cache = this.__cachedTemplates;

			if ($.isEmptyObject(cache)) {
				return null;
			}

			if (!isString(templateId) || !$.trim(templateId)) {
				throwFwError(ERR_CODE_TEMPLATE_INVALID_ID);
			}

			var template = cache[templateId];

			if (!template) {
				throwFwError(ERR_CODE_TEMPLATE_ID_UNAVAILABLE, templateId);
			}

			var p = (param) ? $.extend(true, {}, param) : {};
			var helper = p.hasOwnProperty('_h') ? new EJS.Helpers(p) : new EJS.Helpers(p, {
				_h: helperExtras
			});
			var ret = null;

			try {
				ret = template.call(p, p, helper);
			} catch (e) {
				throwFwError(ERR_CODE_TEMPLATE_PROPATY_UNDEFINED, e.toString(), e);
			}

			return ret;
		},

		/**
		 * 要素を指定されたIDのテンプレートで書き換えます。
		 * <p>
		 * templateIdがこのViewインスタンスで利用可能でなければエラーを投げますが、
		 * コントローラが持つviewインスタンスから呼ばれた場合は親コントローラのviewを再帰的にたどります。詳細は<a href="#get">get()</a>をご覧ください。
		 * </p>
		 *
		 * @memberOf View
		 * @name update
		 * @function
		 * @param {String|Element|jQuery} element DOM要素(セレクタ文字列, DOM要素, jQueryオブジェクト)
		 * @param {String} templateId テンプレートID
		 * @param {Object} [param] パラメータ
		 * @returns {Object} テンプレートが適用されたDOM要素(jQueryオブジェクト)
		 */
		update: function(element, templateId, param) {
			return getJQueryObj(element).html(this.get(templateId, param));
		},

		/**
		 * 要素の末尾に指定されたIDのテンプレートを挿入します。
		 * <p>
		 * templateIdがこのViewインスタンスで利用可能でなければエラーを投げますが、
		 * コントローラが持つviewインスタンスから呼ばれた場合は親コントローラのviewを再帰的にたどります。詳細は<a href="#get">get()</a>をご覧ください。
		 * </p>
		 *
		 * @memberOf View
		 * @name append
		 * @function
		 * @param {Element|jQuery} element DOM要素(セレクタ文字列, DOM要素, jQueryオブジェクト)
		 * @param {String} templateId テンプレートID
		 * @param {Object} [param] パラメータ
		 * @returns {Object} テンプレートが適用されたDOM要素(jQueryオブジェクト)
		 */
		append: function(element, templateId, param) {
			return getJQueryObj(element).append(this.get(templateId, param));
		},

		/**
		 * 要素の先頭に指定されたIDのテンプレートを挿入します。
		 * <p>
		 * templateIdがこのViewインスタンスで利用可能でなければエラーを投げますが、
		 * コントローラが持つviewインスタンスから呼ばれた場合は親コントローラのviewを再帰的にたどります。詳細は<a href="#get">get()</a>をご覧ください。
		 * </p>
		 *
		 * @memberOf View
		 * @name prepend
		 * @function
		 * @param {String|Element|jQuery} element DOM要素(セレクタ文字列, DOM要素, jQueryオブジェクト)
		 * @param {String} templateId テンプレートID
		 * @param {Object} [param] パラメータ
		 * @returns {Object} テンプレートが適用されたDOM要素(jQueryオブジェクト)
		 */
		prepend: function(element, templateId, param) {
			return getJQueryObj(element).prepend(this.get(templateId, param));
		},

		/**
		 * 指定されたテンプレートIDのテンプレートが存在するか判定します。
		 *
		 * @memberOf View
		 * @name isAvailable
		 * @function
		 * @param {String} templateId テンプレートID
		 * @returns {Boolean} 判定結果(存在する: true / 存在しない: false)
		 */
		isAvailable: function(templateId) {
			return !!this.__cachedTemplates[templateId];
		},

		/**
		 * 引数に指定されたテンプレートIDをもつテンプレートをキャッシュから削除します。 引数を指定しない場合はキャッシュされている全てのテンプレートを削除します。
		 *
		 * @memberOf View
		 * @name clear
		 * @param {String|String[]} templateIds テンプレートID
		 * @function
		 */
		clear: function(templateIds) {
			if (templateIds === undefined) {
				this.__cachedTemplates = {};
				return;
			}

			var templateIdsArray = null;
			switch ($.type(templateIds)) {
			case 'string':
				templateIdsArray = [templateIds];
				break;
			case 'array':
				if (!templateIds.length) {
					throwFwError(ERR_CODE_TEMPLATE_INVALID_ID);
				}
				templateIdsArray = templateIds;
				break;
			default:
				throwFwError(ERR_CODE_TEMPLATE_INVALID_ID);
			}

			for ( var i = 0, len = templateIdsArray.length; i < len; i++) {
				var id = templateIdsArray[i];
				if (!isString(id) || !$.trim(id)) {
					throwFwError(ERR_CODE_TEMPLATE_INVALID_ID);
				}
				/* del begin */
				if (!this.__cachedTemplates[id]) {
					fwLogger.warn(FW_LOG_TEMPLATE_NOT_REGISTERED, id);
				}
				/* del end */
			}

			for ( var i = 0, len = templateIdsArray.length; i < len; i++) {
				delete this.__cachedTemplates[templateIdsArray[i]];
			}
		},

		/**
		 * データバインドを開始します。
		 * <p>
		 * 注意:<br>
		 * このメソッドではバインド対象にコメントビューを指定できません。<br>
		 * コメントビューを使用したデータバインドは、コントローラが持つViewインスタンスから実行して下さい。
		 *
		 * @since 1.1.0
		 * @param {String|Element|Element[]|jQuery} element コメントビュー疑似セレクタ、またはDOM要素(セレクタ文字列, DOM要素,
		 *            DOM要素の配列, jQueryオブジェクト)。 DOM要素の配列を指定する場合、全ての要素ノードの親ノードが同じでなければいけません。
		 * @param {Object} context データコンテキストオブジェクト
		 * @memberOf View
		 * @name bind
		 * @function
		 */
		bind: function(element, context) {
			var targetNodes = null;

			if (element == null) {
				throwFwError(ERR_CODE_BIND_INVALID_TARGET);
			}

			// targetのチェック
			if ($.isArray(element)) {
				//配列はDOMノードの配列であることを仮定
				targetNodes = element;
			} else {
				//targetがDOM、セレクタ文字列の場合をまとめて扱う
				//インラインテンプレートが指定された場合はコントローラ側のview.bindが予めノード化しているので
				//ここに到達した時にはノードになっている
				var $element = $(element);

				if ($element.length === 0) {
					// 要素がない、もしくは見つからない場合はエラー
					throwFwError(ERR_CODE_BIND_INVALID_TARGET);
				}

				//bind()はルートノードが複数であることをサポートするので、lengthは1には限定しない
				//ただし、これはappend, prepend等の動作を考慮したものである。
				//つまり、全ての要素は同じノードを親として持っていることを前提としている。
				//厳密にはチェックすべきだが、実際に問題になることはほとんどないだろうと考え行っていない。
				targetNodes = $element.toArray();
			}

			// contextのチェック
			if (context == null || typeof context !== 'object' || $.isArray(context)
					|| h5.core.data.isObservableArray(context)) {
				throwFwError(ERR_CODE_BIND_CONTEXT_INVALID);
			}

			return h5internal.view.createBinding(targetNodes, context);
		}
	});

	var view = new View();

	/**
	 * <a href="./View.html">View</a>クラスのインスタンスを生成します。
	 * <p>
	 * この関数はh5.core.viewに公開されたViewインスタンスのみが持ちます。この関数で作られたViewインスタンスはcreateView()を持ちません。
	 * </p>
	 *
	 * @name createView
	 * @memberOf h5.core.view
	 * @function
	 */
	view.createView = function() {
		return new View();
	};

	/**
	 * HTMLに記述されたテンプレートを読み込む
	 * <p>
	 * HTMLにあるテンプレートが構文エラーの場合は、例外そのままスローする。
	 */
	$(function() {
		$('script[type="text/ejs"]').each(function() {
			var templateId = $.trim(this.id);
			var templateText = $.trim(this.innerHTML);

			if (templateText.length === 0 || !templateId) {
				return;
			}

			var compiledTemplate = new EJS.Compiler(templateText, DELIMITER);
			compiledTemplate.compile();
			view.__cachedTemplates[templateId] = compiledTemplate.process;
		});
	});

	// =============================
	// Expose to window
	// =============================

	/**
	 * <p>
	 * グローバルに公開されているViewクラスのインスタンスです。
	 * </p>
	 * <p>
	 * h5.core.viewは、Viewクラスであり、Viewクラスのメソッドを持ちます。<br>
	 * ただし、h5.core.viewはViewクラスを生成するためのcreateViewメソッドを持ち、生成されたViewクラスはcreateViewメソッドを持ちません。
	 * </p>
	 *
	 * @name view
	 * @memberOf h5.core
	 * @see View
	 * @namespace
	 */
	h5.u.obj.expose('h5.core', {
		view: view
	});

	/* del begin */
	// 開発支援用にcacheManagerをグローバルに出す。
	h5.u.obj.expose('h5.dev.core.view', {
		cacheManager: cacheManager
	});
	/* del end */

})();

/* ------ h5.ui ------ */
(function() {
	// =========================================================================
	//
	// Constants
	//
	// =========================================================================

	// =============================
	// Production
	// =============================

	/**
	 * メッセージを表示する要素のクラス名
	 */
	var CLASS_INDICATOR_THROBBER = 'indicator-throbber';

	/**
	 * スロバーを表示する要素のクラス名
	 */
	var CLASS_INDICATOR_MESSAGE = 'indicator-message';

	/**
	 * スロバー本体(Canvas)に付与するクラス名
	 */
	var CLASS_THROBBER_CANVAS = 'throbber-canvas';

	/**
	 * スロバー内に進捗率(パーセント)を表示する要素のクラス名
	 */
	var CLASS_THROBBER_PERCENT = 'throbber-percent';

	/**
	 * インジケータ - ルートのクラス名
	 */
	var CLASS_INDICATOR_ROOT = 'h5-indicator';

	/**
	 * インジケータ - メッセージのクラス名
	 */
	var CLASS_INDICATOR_CONTENT = 'content';

	/**
	 * インジケータ - オーバーレイのクラス名
	 */
	var CLASS_OVERLAY = 'overlay';

	/**
	 * インジケータ - オーバーレイのクラス名
	 * <p>
	 * IE6でのみ使用する。
	 */
	var CLASS_SKIN = 'skin';

	/**
	 * 一番外側にあるVML要素のクラス名
	 */
	var CLASS_VML_ROOT = 'vml-root';

	/**
	 * メッセージに要素に表示する文字列のフォーマット
	 */
	var FORMAT_THROBBER_MESSAGE_AREA = '<span class="' + CLASS_INDICATOR_THROBBER
			+ '"></span><span class="' + CLASS_INDICATOR_MESSAGE + '" {0}>{1}</span>';

	/**
	 * jQuery.data()で使用するキー名
	 * <p>
	 * インジケータ表示前のスタイル、positionプロパティの値を保持するために使用する
	 */
	var DATA_KEY_POSITION = 'before-position';

	/**
	 * jQuery.data()で使用するキー名
	 * <p>
	 * インジケータ表示前のスタイル、zoomプロパティの値を保持するために使用する
	 */
	var DATA_KEY_ZOOM = 'before-zoom';

	/**
	 * scrollToTop() リトライまでの待機時間
	 */
	var WAIT_MILLIS = 500;


	// =============================
	// Development Only
	// =============================

	/* del begin */
	/* del end */

	// =========================================================================
	//
	// Cache
	//
	// =========================================================================
	var isPromise = h5.async.isPromise;
	var h5ua = h5.env.ua;
	var isJQueryObject = h5.u.obj.isJQueryObject;
	var argsToArray = h5.u.obj.argsToArray;

	// =========================================================================
	//
	// Privates
	//
	// =========================================================================

	// =============================
	// Variables
	// =============================
	// h5.cssを読み込んで、Canvas版スロバーに適用するスタイルの情報を保持するマップ
	// key:クラス名  value:CSSプロパティ名
	var throbberStyleMap = {
		throbber: ['width', 'height'],
		'throbber-line': ['width', 'color']
	};

	/**
	 * Canvasをサポートしているか
	 * <p>
	 * (true:サポート/false:未サポート)
	 */
	var isCanvasSupported = !!document.createElement('canvas').getContext;

	/**
	 * VMLをサポートしているか (true:サポート/false:未サポート)
	 */
	// 機能ベースでVMLのサポート判定を行う(IE6,7,8,9:true その他のブラウザ:false)
	var isVMLSupported = (function() {
		var fragment = document.createDocumentFragment();
		var div = fragment.appendChild(document.createElement('div'));
		div.innerHTML = '<v:line strokeweight="1"/>';
		var child = div.firstChild;
		child.style.behavior = 'url(#default#VML)';
		return typeof child.strokeweight === 'number';
	})();

	/**
	 * 互換モードか判定します
	 */
	var compatMode = (document.compatMode !== 'CSS1Compat');

	/**
	 * 対象ブラウザがIE6以前のブラウザか
	 */
	var isLegacyIE = h5ua.isIE && h5ua.browserVersion <= 6;

	/**
	 * timer + transformでスロバーを回すかどうか (PC版chromeでは、timer + transformでスロバーを回すようにするため)
	 */
	var useTransformTimerAnimation = h5ua.isChrome && h5ua.isDesktop;

	/**
	 * position:fixedでインジケータを描画するかのフラグ。
	 * <p>
	 * 自動更新またはアップデート可能なブラウザは、最新のブラウザであるものとして判定しない。(常にposition:fixedは有効とする)
	 * <p>
	 * 以下の理由から、機能ベースでの判定は行わない。
	 * <ul>
	 * <li>$.support.fixedPosition()にバグがあり、モバイルブラウザの判定が正しくない。</li>
	 * <li>jQuery1.8では、$.support.fixedPosition()が無くなっている。 (fixedPositionを判定するAPIが無い)</li>
	 * <li>機能ベースでモバイル・デスクトップの両方を検知するのは困難。</li>
	 * </ul>
	 * <p>
	 * <b>position:fixedについて</b>
	 * <ul>
	 * <li>position:fixed対応表: http://caniuse.com/css-fixed</li>
	 * <li>Androidは2.2からposition:fixedをサポートしており、2.2と2.3はmetaタグに「user-scalable=no」が設定されていないと機能しない。<br>
	 * http://blog.webcreativepark.net/2011/12/07-052517.html </li>
	 * <li>Androidのデフォルトブラウザでposition:fixedを使用すると、2.xはkeyframesとtransformをposition:fixedで使用すると正しい位置に表示されないバグが、4.xは画面の向きが変更されると描画が崩れるバグがあるため使用しない。
	 * <li>Windows Phoneは7.0/7.5ともに未サポート https://github.com/jquery/jquery-mobile/issues/3489</li>
	 * <ul>
	 */
	var usePositionFixed = !(h5ua.isAndroidDefaultBrowser
			|| (h5ua.isiOS && h5ua.browserVersion < 5) || isLegacyIE || compatMode || h5ua.isWindowsPhone);

	/**
	 * CSS3 Animationsをサポートしているか
	 * <p>
	 * (true:サポート/false:未サポート)
	 */
	var isCSS3AnimationsSupported = null;

	/**
	 * ウィンドウの高さを取得するメソッド
	 */
	var windowHeight = null;

	/**
	 * ドキュメントの高さを取得するメソッド
	 */
	var documentHeight = null;

	/**
	 * ドキュメントの高さを取得するメソッド
	 */
	var documentWidth = null;

	/**
	 * Y方向のスクロール値を取得するメソッド
	 */
	var scrollTop = null;

	/**
	 * Y方向のスクロール値を取得するメソッド
	 */
	var scrollLeft = null;

	// =============================
	// Functions
	// =============================

	/**
	 * 指定されたCSS3プロパティをサポートしているか判定します。
	 * <p>
	 * プレフィックスなし、プレフィックスありでサポート判定を行います。
	 * <p>
	 * 判定に使用するプレフィックス
	 * <ul>
	 * <li>Khtml (Safari2以前)</li>
	 * <li>ms (IE)</li>
	 * <li>O (Opera)</li>
	 * <li>Moz (Firefox)</li>
	 * <li>Webkit (Safari2以降/Chrome)</li>
	 * </ul>
	 * <p>
	 * ※Chrome20にて、WebKitプレフィックスはデバッグでの表示上は小文字(webkitXxxxx)だが、先頭文字が小文字または大文字でも正しく判定される。
	 * しかし、古いバージョンでは確認できていないため『Webkit』で判定する。
	 */
	var supportsCSS3Property = (function() {
		var fragment = document.createDocumentFragment();
		var div = fragment.appendChild(document.createElement('div'));
		var prefixes = 'Webkit Moz O ms Khtml'.split(' ');
		var len = prefixes.length;

		return function(propName) {
			// CSSシンタックス(ハイフン区切りの文字列)をキャメルケースに変換
			var propCamel = $.camelCase(propName);

			// ベンダープレフィックスなしでサポートしているか判定
			if (propCamel in div.style) {
				return true;
			}

			propCamel = propCamel.charAt(0).toUpperCase() + propCamel.slice(1);

			// ベンダープレフィックスありでサポートしているか判定
			for ( var i = 0; i < len; i++) {
				if (prefixes[i] + propCamel in div.style) {
					return true;
				}
			}

			return false;
		};
	})();

	/**
	 * CSSファイルに書かれた、Canvasのスタイル定義を取得します。
	 */
	function readThrobberStyle(theme) {
		var readStyles = {};

		for ( var prop in throbberStyleMap) {
			var $elem = $('<div></div>').addClass(theme).addClass(prop).appendTo('body');
			var propCamel = $.camelCase(prop);

			readStyles[propCamel] = {};

			$.map(throbberStyleMap[prop], function(item, idx) {
				if (item === 'width' || item === 'height') {
					readStyles[propCamel][item] = parseInt($elem.css(item).replace(/\D/g, ''), 10);
				} else {
					readStyles[propCamel][item] = $elem.css(item);
				}
			});

			$elem.remove();
		}

		return readStyles;
	}

	/**
	 * VML要素を生成します。
	 */
	function createVMLElement(tagName, opt) {
		var elem = window.document.createElement('v:' + tagName);

		for ( var prop in opt) {
			elem.style[prop] = opt[prop];
		}

		return elem;
	}

	/**
	 * 要素のサイズから、スロバーの線を引く座標を計算します。
	 */
	function calculateLineCoords(size, line) {
		var positions = [];
		var centerPos = size / 2;
		var radius = size * 0.8 / 2;
		var eachRadian = 360 / line * Math.PI / 180;

		for ( var j = 1; j <= line; j++) {
			var rad = eachRadian * j;
			var cosRad = Math.cos(rad),sinRad = Math.sin(rad);
			positions.push({
				from: {
					x: centerPos + radius / 2 * cosRad,
					y: centerPos + radius / 2 * sinRad
				},
				to: {
					x: centerPos + radius * cosRad,
					y: centerPos + radius * sinRad
				}
			});
		}

		return positions;
	}

	/**
	 * ドキュメント(コンテンツ全体)の高さまたは幅を取得します。
	 * <p>
	 * ウィンドウの高さを取得したい場合は引数に"Height"を、 ウィンドウの幅を取得したい場合は引数に"Width"を指定して下さい。
	 * <p>
	 * 以下のバグがあるため自前で計算を行う。
	 * <p>
	 * 1.6.4/1.7.1/1.8.0は正しい値を返すが1.7.1ではバグがあるため正しい値を返さない。<br>
	 * http://bugs.jquery.com/ticket/3838<br>
	 * http://pastebin.com/MaUuLjU2
	 * <p>
	 * IE6だと同一要素に対してスタイルにwidthとpaddingを指定するとサイズがおかしくなる。<br>
	 * http://hiromedo-net.sakura.ne.jp/memoblog/?p=47
	 */
	function documentSize(propName) {
		var prop = propName;

		return function() {
			var body = document.body;
			var docElem = document.documentElement;
			// 互換モードの場合はサイズ計算にbody要素を、IE6標準の場合はdocumentElementを使用する
			var elem = compatMode ? body : isLegacyIE ? docElem : null;

			if (elem) {
				if (prop === 'Height') {
					// ウィンドウサイズを大きくすると、scroll[Width/Height]よりもclient[Width/Height]の値のほうが大きくなるため、
					// client[Width/Height]のほうが大きい場合はこの値を返す
					return elem['client' + prop] > elem['scroll' + prop] ? elem['client' + prop]
							: elem['scroll' + prop];
				}
				return elem['client' + prop];
			}
			return Math.max(body['scroll' + prop], docElem['scroll' + prop], body['offset' + prop],
					docElem['offset' + prop], docElem['client' + prop]);

		};
	}

	/**
	 * スクロールバーの幅も含めた、ウィンドウ幅または高さを取得します。
	 * <p>
	 * ウィンドウの高さを取得したい場合は引数に"Height"を、 ウィンドウの幅を取得したい場合は引数に"Width"を指定して下さい。
	 * <p>
	 * jQuery1.8からQuirksモードをサポートしていないため、$(window).height()からウィンドウサイズを取得できない(0を返す)ため、自前で計算を行う。<br>
	 * http://blog.jquery.com/2012/08/30/jquery-1-8-1-released/
	 */
	function windowSize(propName) {
		var prop = propName;

		return function() {
			var body = document.body;
			var docElem = document.documentElement;
			return (typeof window['inner' + prop] === 'number') ? window['inner' + prop]
					: compatMode ? body['client' + prop] : docElem['client' + prop];
		};
	}

	/**
	 * Y方向またはX方向のスクロール量を取得します。
	 * <p>
	 * Y方向のスクロール量を取得したい場合は引数に"Top"を、 X方向のスクロール量を取得したい場合は引数に"Left"を指定して下さい。
	 */
	function scrollPosition(propName) {
		var prop = propName;

		return function() {
			// doctypeが「XHTML1.0 Transitional DTD」だと、document.documentElement.scrollTopが0を返すので、互換モードを判定する
			// http://mokumoku.mydns.jp/dok/88.html
			var elem = compatMode ? document.body : document.documentElement;
			var offsetProp = (prop === 'Top') ? 'Y' : 'X';
			return window['page' + offsetProp + 'Offset'] || elem['scroll' + prop];
		};
	}

	/**
	 * スクロールバーの幅を含めない、ウィンドウ幅または高さを取得します。
	 */
	function getDisplayArea(prop) {
		var e = compatMode ? document.body : document.documentElement;
		return h5ua.isiOS ? window['inner' + prop] : e['client' + prop];
	}

	/**
	 * 指定された要素の左上からの絶対座標を取得します。
	 * <p>
	 * 1.8.xのjQuery.offset()は、Quirksモードでのスクロール量の計算が正しく行われないため自前で計算する。
	 * </p>
	 * <p>
	 * 絶対座標は、<pre>getBoundingClinetRectの値+スクロール量-clientTop/Left</pre>
	 * で計算します。
	 * </p>
	 * <p>
	 * IE6の場合、BODY要素についてgetBoundingClientRect()の値が正しく計算できず、
	 * また、HTML要素のmargin,borderが表示されないので、BODY要素の場合は、htmlのpadding～bodyのborderまでを加えた値を計算して返します。
	 * </p>
	 */
	function getOffset(element) {
		var elem = $(element)[0];
		var body = document.body;
		var html = $('html')[0];
		var box = {
			top: 0,
			left: 0
		};
		if (elem === body && isLegacyIE) {
			return {
				top: parseFloat(html.currentStyle.paddingTop || 0)
						+ parseFloat(body.currentStyle.marginTop || 0)
						+ parseFloat(body.currentStyle.borderTop || 0),
				left: parseFloat(html.currentStyle.paddingLeft || 0)
						+ parseFloat(body.currentStyle.marginLeft || 0)
						+ parseFloat(body.currentStyle.borderLeft || 0)
			};
		}

		if (typeof elem.getBoundingClientRect !== "undefined") {
			box = elem.getBoundingClientRect();
		}

		var docElem = compatMode ? body : document.documentElement;
		var clientTop = docElem.clientTop || 0;
		var clientLeft = docElem.clientLeft || 0;

		return {
			top: box.top + scrollTop() - clientTop,
			left: box.left + scrollLeft() - clientLeft
		};

	}

	/**
	 * 指定された要素で発生したイベントを無効にする
	 */
	function disableEventOnIndicator(/* var_args */) {
		var disabledEventTypes = 'click dblclick touchstart touchmove touchend mousedown mouseup mousemove mouseover mouseout mouseenter mouseleave focus focusin focusout blur change select';

		$.each(argsToArray(arguments), function(i, e) {
			e.bind(disabledEventTypes, function() {
				return false;
			});
		});
	}

	/**
	 * スクリーンロック対象の要素か判定します。
	 */
	function isScreenlockTarget(element) {
		var e = isJQueryObject(element) ? element[0] : element;
		return e === window || e === document || e === document.body;
	}

	// =========================================================================
	//
	// Body
	//
	// =========================================================================

	windowHeight = windowSize('Height');
	documentHeight = documentSize('Height');
	documentWidth = documentSize('Width');
	scrollTop = scrollPosition('Top');
	scrollLeft = scrollPosition('Left');

	// Canvasは非サポートだがVMLがサポートされているブラウザの場合、VMLが機能するよう名前空間とVML要素用のスタイルを定義する
	if (!isCanvasSupported && isVMLSupported) {
		document.namespaces.add('v', 'urn:schemas-microsoft-com:vml');
		// メモリリークとIE9で動作しない問題があるため、document.createStyleSheet()は使用しない
		var vmlStyle = document.createElement('style');
		var styleDef = ['v\\:stroke', 'v\\:line', 'v\\:textbox'].join(',')
				+ ' { behavior:url(#default#VML); }';
		vmlStyle.setAttribute('type', 'text/css');
		vmlStyle.styleSheet.cssText = styleDef;
		document.getElementsByTagName('head')[0].appendChild(vmlStyle);
	}

	// CSS3 Animationのサポート判定
	isCSS3AnimationsSupported = supportsCSS3Property('animationName');

	/**
	 * VML版スロバー (IE 6,7,8)用
	 */
	function ThrobberVML(opt) {
		this.style = $.extend(true, {}, opt);

		var w = this.style.throbber.width;
		var h = this.style.throbber.height;

		this.group = createVMLElement('group', {
			width: w + 'px',
			height: h + 'px'
		});
		this.group.className = CLASS_VML_ROOT;

		var positions = calculateLineCoords(w, this.style.throbber.lines);
		var lineColor = this.style.throbberLine.color;
		var lineWidth = this.style.throbberLine.width;

		for ( var i = 0, len = positions.length; i < len; i++) {
			var pos = positions[i];
			var from = pos.from;
			var to = pos.to;
			var e = createVMLElement('line');
			e.strokeweight = lineWidth;
			e.strokecolor = lineColor;
			e.fillcolor = lineColor;
			e.from = from.x + ',' + from.y;
			e.to = to.x + ',' + to.y;
			var ce = createVMLElement('stroke');
			ce.opacity = 1;
			e.appendChild(ce);
			this.group.appendChild(e);
		}

		this._createPercentArea();
	}

	ThrobberVML.prototype = {
		show: function(root) {
			if (!root) {
				return;
			}

			this.root = root;
			this.highlightPos = 1;
			this.hide();
			this.root.appendChild(this.group);
			this._run();
		},
		hide: function() {
			this.root.innerHTML = "";

			if (this._runId) {
				clearTimeout(this._runId);
				this._runId = null;
			}
		},
		_run: function() {
			var lineCount = this.style.throbber.lines;
			var roundTime = this.style.throbber.roundTime;
			var highlightPos = this.highlightPos;
			var lines = this.group.childNodes;

			for ( var i = 0, len = lines.length; i < len; i++) {
				var child = lines[i];

				if (child.nodeName === 'textbox') {
					continue;
				}

				var lineNum = i + 1;
				var line = child.firstChild;
				if (lineNum == highlightPos) {
					line.opacity = "1";
				} else if (lineNum == highlightPos + 1 || lineNum == highlightPos - 1) {
					line.opacity = "0.75";
				} else {
					line.opacity = "0.4";
				}
			}

			if (highlightPos == lineCount) {
				highlightPos = 0;
			} else {
				highlightPos++;
			}

			this.highlightPos = highlightPos;
			var perMills = Math.floor(roundTime / lineCount);

			var that = this;

			// VML版スロバーはIE8以下専用でかつ、IE8以下はAnimations/Transformに対応していないのでsetTimeoutでスロバーを描写する
			this._runId = setTimeout(function() {
				that._run.call(that);
			}, perMills);
		},
		_createPercentArea: function() {
			var textPath = createVMLElement('textbox');
			var $table = $('<table><tr><td></td></tr></table>');
			var $td = $table.find('td');
			$td.width(this.group.style.width);
			$td.height(this.group.style.height);
			$td.css('line-height', this.group.style.height);
			$td.addClass(CLASS_THROBBER_PERCENT);

			textPath.appendChild($table[0]);
			this.group.appendChild(textPath);
		},
		setPercent: function(percent) {
			$(this.group).find('.' + CLASS_THROBBER_PERCENT).html(percent);
		}
	};

	/**
	 * Canvas版スロバー
	 */
	var ThrobberCanvas = function(opt) {
		this.style = $.extend(true, {}, opt);
		this.canvas = document.createElement('canvas');
		this.baseDiv = document.createElement('div');
		this.percentDiv = document.createElement('div');

		var canvas = this.canvas;
		var baseDiv = this.baseDiv;
		var percentDiv = this.percentDiv;
		// CSSファイルから読み取ったスタイルをCanvasに適用する
		canvas.width = this.style.throbber.width;
		canvas.height = this.style.throbber.height;
		canvas.style.display = 'block';
		canvas.style.position = 'absolute';
		baseDiv.style.width = this.style.throbber.width + 'px';
		baseDiv.style.height = this.style.throbber.height + 'px';
		baseDiv.appendChild(canvas);
		// パーセント表示用DIV
		percentDiv.style.width = this.style.throbber.width + 'px';
		percentDiv.style.height = this.style.throbber.height + 'px';
		percentDiv.style.lineHeight = this.style.throbber.height + 'px';
		percentDiv.className = CLASS_THROBBER_PERCENT;
		baseDiv.appendChild(percentDiv);

		this.positions = calculateLineCoords(canvas.width, this.style.throbber.lines);
	};

	ThrobberCanvas.prototype = {
		show: function(root) {
			if (!root) {
				return;
			}

			this.root = root;
			this.highlightPos = 1;
			this.hide();
			this.root.appendChild(this.baseDiv);
			this._run();
		},
		hide: function() {
			// this.root.innerHTML = ''だと、IEにてthis.child.innerHTMLまで空になってしまう
			// removeChildを使うとDOMがない時にエラーが出るため、jQueryのremove()を使っている
			$(this.baseDiv).remove();

			if (this._runId) {
				// Timerを止める
				// chromeの場合はsetIntervalでタイマーを回しているため、clearIntervalで止める
				if (useTransformTimerAnimation) {
					clearInterval(this._runId);
				} else {
					clearTimeout(this._runId);
				}
				this._runId = null;
			}
		},
		_run: function() {
			var canvas = this.canvas;
			var ctx = canvas.getContext('2d');
			var highlightPos = this.highlightPos;
			var positions = this.positions;
			var lineColor = this.style.throbberLine.color;
			var lineWidth = this.style.throbberLine.width;
			var lineCount = this.style.throbber.lines;
			var roundTime = this.style.throbber.roundTime;

			canvas.width = canvas.width;

			for ( var i = 0, len = positions.length; i < len; i++) {
				ctx.beginPath();
				ctx.strokeStyle = lineColor;
				ctx.lineWidth = lineWidth;
				var lineNum = i + 1;
				if (lineNum == highlightPos) {
					ctx.globalAlpha = 1;
				} else if (lineNum == highlightPos + 1 || lineNum == highlightPos - 1) {
					ctx.globalAlpha = 0.75;
				} else {
					ctx.globalAlpha = 0.4;
				}
				var pos = positions[i];
				var from = pos.from;
				var to = pos.to;
				ctx.moveTo(from.x, from.y);
				ctx.lineTo(to.x, to.y);
				ctx.stroke();
			}
			if (highlightPos == lineCount) {
				highlightPos = 0;
			} else {
				highlightPos++;
			}
			this.highlightPos = highlightPos;


			if (useTransformTimerAnimation) {
				// chrome22で、webkit-animationでアニメーションしている要素を消すと、表示上残ってしまう。(すべてのPCで起きるわけではない)
				// そのため、chromeの場合はwebkit-animationを使わず、Timer + transform でスロバーを回している
				//
				// このwebkit-animationの問題について調べたところ、
				// chrome23βでも同様の問題が起きたが、
				// chrome24devとchrome25canaryではきちんと消えることを確認した。(2012/11/06現在)
				var deg = 0;
				this._runId = setInterval(function() {
					deg++;
					canvas.style.webkitTransform = 'rotate(' + deg + 'deg)';
					if (deg >= 360) {
						deg -= 360;
					}
				}, roundTime / 360);
				return;
			}

			if (isCSS3AnimationsSupported) {
				// CSS3Animationをサポートしている場合は、keyframesでスロバーを描写する
				canvas.className = CLASS_THROBBER_CANVAS;
			} else {
				var perMills = Math.floor(roundTime / lineCount);
				var that = this;

				// CSSAnimation未サポートの場合タイマーアニメーションで描画する
				// 対象ブラウザ: Firefox 2,3 / Opera  9.0～10.1 / Opera Mini 5.0～7.0 / Opera Mobile 10.0
				// http://caniuse.com/transforms2d
				// http://caniuse.com/#search=canvas
				// ただし、Android 2.xは、-webkit-keyframesで-webkit-transformを使用すると、topとleftを変更してもその位置に描画されないバグがあるため、
				// タイマーアニメーションでスロバーを描写する
				this._runId = setTimeout(function() {
					that._run.call(that);
				}, perMills);
			}
		},
		setPercent: function(percent) {
			this.percentDiv.innerHTML = percent;
		}
	};

	/**
	 * インジケータ(メッセージ・画面ブロック・進捗表示)の表示や非表示を行うクラス。
	 *
	 * @class
	 * @name Indicator
	 * @param {String|Object} target インジケータを表示する対象のDOM要素、jQueryオブジェクトまたはセレクタ
	 * @param {Object} [option] オプション
	 * @param {String} [option.message] スロバーの右側に表示する文字列 (デフォルト:未指定)
	 * @param {Number} [option.percent] スロバーの中央に表示する数値。0～100で指定する (デフォルト:未指定)
	 * @param {Boolean} [option.block] 画面を操作できないようオーバーレイ表示するか (true:する/false:しない) (デフォルト:true)
	 * @param {Number} [option.fadeIn] インジケータをフェードで表示する場合、表示までの時間をミリ秒(ms)で指定する (デフォルト:フェードしない)
	 * @param {Number} [option.fadeOut] インジケータをフェードで非表示にする場合、非表示までの時間をミリ秒(ms)で指定する (デフォルト:しない)
	 * @param {Promise|Promise[]} [option.promises] Promiseオブジェクト (Promiseの状態に合わせて自動でインジケータの非表示を行う)
	 * @param {String} [option.theme] テーマクラス名 (インジケータのにスタイル定義の基点となるクラス名 (デフォルト:'a')
	 * @param {String} [option.throbber.lines] スロバーの線の本数 (デフォルト:12)
	 * @param {String} [option.throbber.roundTime] スロバーの白線が1周するまでの時間(ms)
	 *            (このオプションはCSS3Animationを未サポートブラウザのみ有効) (デフォルト:1000)
	 */
	function Indicator(target, option) {
		var that = this;
		var $t = $(target);
		// デフォルトオプション
		var defaultOption = {
			message: '',
			percent: -1,
			block: true,
			fadeIn: -1,
			fadeOut: -1,
			promises: null,
			theme: 'a'
		};
		// スロバーのスタイル定義 (基本的にはCSSで記述する。ただし固定値はここで設定する)
		// CSSAnimationsがサポートされているブラウザの場合、CSSのanimation-durationを使用するためroundTimeプロパティの値は使用しない
		var defaultStyle = {
			throbber: {
				roundTime: 1000,
				lines: 12
			},
			throbberLine: {},
			percent: {}
		};
		// デフォルトオプションとユーザオプションをマージしたオプション情報
		var settings = $.extend(true, {}, defaultOption, option);

		// インジケータを画面に表示したか
		this._displayed = false;
		// スロバーを保持する配列
		this._throbbers = [];
		// オプション情報
		this._settings = settings;
		// スタイル情報
		this._styles = $.extend(true, {}, defaultStyle, readThrobberStyle(settings.theme));
		// スクリーンロックで表示するか
		this._isScreenLock = isScreenlockTarget($t);
		// 表示対象であるDOM要素を保持するjQueryオブジェクト
		this._$target = this._isScreenLock ? $('body') : $t;
		// 表示対象のDOM要素 (旧バージョン互換用)
		this._target = this._$target.length === 1 ? this._$target[0] : this._$target.toArray();
		// scroll/touchmoveイベントハンドラで使用するタイマーID
		this._scrollEventTimerId = null;
		// scroll/touchmoveイベントハンドラ
		this._scrollHandler = function() {
			that._handleScrollEvent();
		};
		// resize/orientationchangeイベントハンドラ内で使用するタイマーID
		this._resizeEventTimerId = null;
		// scroll/touchmoveイベントハンドラ
		this._resizeHandler = function() {
			that._handleResizeEvent();
		};
		// DOM要素の書き換え可能かを判定するフラグ
		this._redrawable = true;
		// _redrawable=false時、percent()に渡された最新の値
		this._lastPercent = -1;
		// _redrawable=false時、message()に渡された最新の値
		this._lastMessage = null;
		// フェードインの時間 (フェードインで表示しない場合は-1)
		this._fadeInTime = typeof settings.fadeIn === 'number' ? settings.fadeIn : -1;
		// フェードアウトの時間 (フェードアウトで表示しない場合は-1)
		this._fadeOutTime = typeof settings.fadeOut === 'number' ? settings.fadeOut : -1;
		// コンテンツ(メッセージ/スロバー)
		this._$content = $();
		// オーバーレイ
		this._$overlay = $();
		// スキン - IE6の場合selectタグがz-indexを無視するため、オーバーレイと同一階層にiframe要素を生成してselectタグを操作出来ないようにする
		// http://www.programming-magic.com/20071107222415/
		this._$skin = $();

		// コンテンツ内の要素
		var contentElem = h5.u.str.format(FORMAT_THROBBER_MESSAGE_AREA,
				(settings.message === '') ? 'style="display: none;"' : '', settings.message);
		// httpsでiframeを開くと警告が出るためsrcに指定する値を変える
		// http://www.ninxit.com/blog/2008/04/07/ie6-https-iframe/
		var srcVal = 'https' === document.location.protocol ? 'return:false' : 'about:blank';

		for ( var i = 0, len = this._$target.length; i < len; i++) {
			this._$content = this._$content.add($('<div></div>').append(contentElem).addClass(
					CLASS_INDICATOR_ROOT).addClass(settings.theme)
					.addClass(CLASS_INDICATOR_CONTENT).hide());
			this._$overlay = this._$overlay.add((settings.block ? $('<div></div>') : $()).addClass(
					CLASS_INDICATOR_ROOT).addClass(settings.theme).addClass(CLASS_OVERLAY).hide());
			this._$skin = this._$skin.add(((isLegacyIE || compatMode) ? $('<iframe></iframe>')
					: $()).attr('src', srcVal).addClass(CLASS_INDICATOR_ROOT).addClass(CLASS_SKIN)
					.hide());
		}

		var position = this._isScreenLock && usePositionFixed ? 'fixed' : 'absolute';
		// オーバーレイ・コンテンツにpositionを設定する
		$.each([this._$overlay, this._$content], function(i, e) {
			e.css('position', position);
		});

		var promises = settings.promises;
		var promiseCallback = function() {
			that.hide();
		};

		if ($.isArray(promises)) {
			$.map(promises, function(item, idx) {
				return isPromise(item) ? item : null;
			});

			if (promises.length > 0) {
				h5.async.when(promises).pipe(promiseCallback, promiseCallback);
			}
		} else if (isPromise(promises)) {
			promises.pipe(promiseCallback, promiseCallback);
		}
	}

	Indicator.prototype = {
		/**
		 * 画面上にインジケータ(メッセージ・画面ブロック・進捗表示)を表示します。
		 *
		 * @memberOf Indicator
		 * @function
		 * @returns {Indicator} インジケータオブジェクト
		 */
		show: function() {
			if (this._displayed || this._$target.children('.' + CLASS_INDICATOR_ROOT).length > 0) {
				return this;
			}

			this._displayed = true;

			var that = this;
			var fadeInTime = this._fadeInTime;
			var cb = function() {
				var $window = $(window);

				if (that._isScreenLock) {
					disableEventOnIndicator(that._$overlay, that._$content);

					if (!usePositionFixed) {
						$window.bind('touchmove', that._scrollHandler);
						$window.bind('scroll', that._scrollHandler);
					}
				}

				// 画面の向きの変更を検知したらインジータを中央に表示させる
				$window.bind('orientationchange', that._resizeHandler);
				$window.bind('resize', that._resizeHandler);
			};

			for ( var i = 0, len = this._$target.length; i < len; i++) {
				var _$target = this._$target.eq(i);
				var _$content = this._$content.eq(i);
				var _$skin = this._$skin.eq(i);
				var _$overlay = this._$overlay.eq(i);

				// position:absoluteの子要素を親要素からの相対位置で表示するため、親要素がposition:staticの場合はrelativeに変更する(親要素がbody(スクリーンロック)の場合は変更しない)
				// また、IEのレイアウトバグを回避するためzoom:1を設定する
				if (!this._isScreenLock && _$target.css('position') === 'static') {
					// スロバーメッセージ要素に親要素のposition/zoomを記憶させておく
					_$target.data(DATA_KEY_POSITION, _$target.css('position'));
					_$target.data(DATA_KEY_ZOOM, _$target.css('zoom'));

					_$target.css({
						position: 'relative',
						zoom: '1'
					});
				}

				var throbber = isCanvasSupported ? new ThrobberCanvas(this._styles)
						: isVMLSupported ? new ThrobberVML(this._styles) : null;

				if (throbber) {
					that._throbbers.push(throbber);
					that.percent(this._settings.percent);
					throbber.show(_$content.children('.' + CLASS_INDICATOR_THROBBER)[0]);
				}

				_$target.append(_$skin).append(_$overlay).append(_$content);
			}

			var $elems = $().add(this._$skin).add(this._$content).add(this._$overlay);

			if (fadeInTime < 0) {
				$elems.show();
				cb();
			} else {
				$elems.fadeIn(fadeInTime, cb);
			}

			this._reposition();
			this._resizeOverlay();
			return this;
		},
		/**
		 * オーバーレイのサイズを再計算します。
		 * <p>
		 * position:fixedで表示している場合は再計算しません。
		 * <p>
		 * position:absoluteの場合は高さのみ再計算を行い、IE6以下の標準モード及びQuirksモードの場合は高さと幅の両方を再計算します。
		 *
		 * @memberOf Indicator
		 * @function
		 * @private
		 */
		_resizeOverlay: function() {
			if (usePositionFixed) {
				return;
			}

			for ( var i = 0, len = this._$target.length; i < len; i++) {
				var _$target = this._$target.eq(i);
				var _$overlay = this._$overlay.eq(i);
				var _$skin = this._$skin.eq(i);

				var w = this._isScreenLock ? documentWidth() : _$target.outerWidth(true);
				var h = this._isScreenLock ? documentHeight() : _$target.outerHeight(true);

				if (isLegacyIE || compatMode) {
					// IE6はwidthにバグがあるため、heightに加えてwidthも自前で計算を行う。
					// http://webdesigner00.blog11.fc2.com/blog-entry-56.html
					$.each([_$overlay, _$skin], function(i, e) {
						e.width(w).height(h);
					});
				} else if (!usePositionFixed) {
					// heightは100%で自動計算されるので何もしない
					_$overlay.height(h);
				}
			}
		},
		/**
		 * インジケータのメッセージ要素のwidthを調整し、中央になるようtopとleftの位置を設定します。
		 *
		 * @memberOf Indicator
		 * @function
		 * @private
		 */
		_reposition: function() {
			for ( var i = 0, len = this._$target.length; i < len; i++) {
				var _$target = this._$target.eq(i);
				var _$content = this._$content.eq(i);

				if (this._isScreenLock) {
					// MobileSafari(iOS4)だと $(window).height()≠window.innerHeightなので、window.innerHeightをから高さを取得する
					// また、quirksモードでjQuery1.8.xの$(window).height()を実行すると0を返すので、clientHeightから高さを取得する
					var wh = windowHeight();

					if (usePositionFixed) {
						// 可視領域からtopを計算する
						_$content.css('top', ((wh - _$content.outerHeight()) / 2) + 'px');
					} else {
						// 可視領域+スクロール領域からtopを計算する
						_$content.css('top',
								((scrollTop() + (wh / 2)) - (_$content.outerHeight() / 2)) + 'px');
					}
				} else {
					_$content.css('top', ((_$target.outerHeight() - _$content.outerHeight()) / 2)
							+ 'px');
				}

				var blockElementPadding = _$content.innerWidth() - _$content.width();
				var totalWidth = 0;

				_$content.children().each(function(i, e) {
					var $e = $(e);
					// IE9にて不可視要素に対してouterWidth(true)を実行すると不正な値が返ってくるため、display:noneの場合は値を取得しない
					if ($e.css('display') === 'none') {
						return true;
					}
					totalWidth += $e.outerWidth(true);
				});
				_$content.width(totalWidth + blockElementPadding);
				_$content.css('left', ((_$target.width() - _$content.outerWidth()) / 2) + 'px');
			}
		},
		/**
		 * 画面上に表示されているインジケータ(メッセージ・画面ブロック・進捗表示)を除去します。
		 *
		 * @memberOf Indicator
		 * @function
		 * @returns {Indicator} インジケータオブジェクト
		 */
		hide: function() {
			if (!this._displayed) {
				return this;
			}

			this._displayed = false;

			var that = this;
			var fadeOutTime = this._fadeOutTime;
			var $elems = $().add(this._$skin).add(this._$content).add(this._$overlay);
			var cb = function() {
				var $window = $(window);

				$elems.remove();
				// 親要素のposition/zoomをインジケータ表示前の状態に戻す
				if (!that._isScreenLock) {
					that._$target.each(function(i, e) {
						var $e = $(e);

						$e.css({
							position: $e.data(DATA_KEY_POSITION),
							zoom: $e.data(DATA_KEY_ZOOM)
						});

						$e.removeData(DATA_KEY_POSITION).removeData(DATA_KEY_ZOOM);
					});
				}

				$window.unbind('touchmove', that._scrollHandler);
				$window.unbind('scroll', that._scrollHandler);
				$window.unbind('orientationchange', that._resizeHandler);
				$window.unbind('resize', that._resizeHandler);

				if (that._resizeEventTimerId) {
					clearTimeout(that._resizeEventTimerId);
				}
				if (that._scrollEventTimerId) {
					clearTimeout(that._scrollEventTimerId);
				}
			};

			if (!isCSS3AnimationsSupported || useTransformTimerAnimation) {
				// CSS3Animationをサポートしないブラウザまたはchromeの場合、タイマーでスロバーのアニメーションを動かしているため、スロバーのhide()でタイマーを停止させる。
				for ( var i = 0, len = this._throbbers.length; i < len; i++) {
					this._throbbers[i].hide();
				}
			}

			if (fadeOutTime < 0) {
				$elems.hide();
				cb();
			} else {
				$elems.fadeOut(fadeOutTime, cb);
			}

			return this;
		},
		/**
		 * 進捗のパーセント値を指定された値に更新します。
		 *
		 * @memberOf Indicator
		 * @function
		 * @param {Number} percent 進捗率(0～100%)
		 * @returns {Indicator} インジケータオブジェクト
		 */
		percent: function(percent) {
			if (typeof percent !== 'number' || !(percent >= 0 && percent <= 100)) {
				return this;
			}

			if (!this._redrawable) {
				this._lastPercent = percent;
				return this;
			}

			for ( var i = 0, len = this._throbbers.length; i < len; i++) {
				this._throbbers[i].setPercent(percent);
			}

			return this;
		},
		/**
		 * メッセージを指定された値に更新します。
		 *
		 * @memberOf Indicator
		 * @function
		 * @param {String} message メッセージ
		 * @returns {Indicator} インジケータオブジェクト
		 */
		message: function(message) {
			if (!isString(message)) {
				return this;
			}

			if (!this._redrawable) {
				this._lastMessage = message;
				return this;
			}

			this._$content.children('.' + CLASS_INDICATOR_MESSAGE).css('display', 'inline-block')
					.text(message);
			this._reposition();

			return this;
		},
		/**
		 * scroll/touchmoveイベントハンドラ
		 * <p>
		 * タッチまたはホイールスクロールの停止を検知します
		 */
		_handleScrollEvent: function() {
			if (this._scrollEventTimerId) {
				clearTimeout(this._scrollEventTimerId);
			}

			if (!this._redrawable) {
				return;
			}

			var that = this;
			this._scrollEventTimerId = setTimeout(function() {
				that._reposition();
				that._scrollEventTimerId = null;
			}, 50);
		},
		/**
		 * orientationChange/resizeイベントハンドラ
		 * <p>
		 * orientationChange/resizeイベントが発生した1秒後に、インジケータとオーバーレイを画面サイズに合わせて再描画し、 メッセージとパーセントの内容を更新する。
		 *
		 * @memberOf Indicator
		 * @function
		 * @private
		 */
		_handleResizeEvent: function() {
			var that = this;

			function updateMessageArea() {
				that._resizeOverlay();
				that._reposition();
				that._redrawable = true;
				that.percent(that._lastPercent);
				that.message(that._lastMessage);
				that._resizeEventTimerId = null;
			}

			if (this._resizeEventTimerId) {
				clearTimeout(this._resizeEventTimerId);
			}

			this._redrawable = false;

			if (usePositionFixed || isLegacyIE || compatMode) {
				updateMessageArea();
			} else {
				// Android 4.xの場合、orientationChangeイベント発生直後にDOM要素の書き換えを行うと画面の再描画が起こらなくなることがあるため、対症療法的に対処
				this._resizeEventTimerId = setTimeout(function() {
					updateMessageArea();
				}, 1000);
			}
		}
	};

	/**
	 * 指定された要素に対して、インジケータ(メッセージ・画面ブロック・進捗)の表示や非表示を行うためのオブジェクトを取得します。
	 * <p>
	 * targetに<b>document</b>、<b>window</b>または<b>body</b>を指定しかつ、blockオプションがtrueの場合、「スクリーンロック」として動作します。<br>
	 * 上記以外のDOM要素を指定した場合は、指定した要素上にインジケータを表示します。
	 * <p>
	 * <b>スクリーンロック</b>とは、コンテンツ領域(スクロールしないと見えない領域も全て含めた領域)全体にオーバーレイを、表示領域(画面に見えている領域)中央にメッセージが表示し、画面を操作できないようにすることです。スマートフォン等タッチ操作に対応する端末の場合、スクロール操作も禁止します。
	 * <h4>スクリーンロック中の制限事項</h4>
	 * <ul>
	 * <li>Android
	 * 4.xにてorientationchangeイベント発生直後にインジケータのDOM要素の書き換えを行うと画面の再描画が起こらなくなってしまうため、orientationchangeイベント発生から1秒間percent()/massage()での画面の書き換えをブロックします。<br>
	 * orientationchagenイベント発生から1秒以内にpercent()/message()で値を設定した場合、最後に設定された値が画面に反映されます。</li>
	 * <li>WindowsPhone
	 * 7ではscrollイベントを抑止できないため、インジケータ背後の要素がスクロールしてしまいます。ただし、クリック等その他のイベントはキャンセルされます。</li>
	 * </ul>
	 * <h4>使用例</h4>
	 * <b>スクリーンロックとして表示する</b><br>
	 *
	 * <pre>
	 * var indicator = h5.ui.indicator({
	 * 	target: document,
	 * }).show();
	 * </pre>
	 *
	 * <b>li要素にスロバー(くるくる回るアイコン)を表示してブロックを表示しない場合</b><br>
	 *
	 * <pre>
	 * var indicator = h5.ui.indicator('li', {
	 * 	block: false
	 * }).show();
	 * </pre>
	 *
	 * <b>パラメータにPromiseオブジェクトを指定して、done()/fail()の実行と同時にインジケータを除去する</b><br>
	 * resolve() または resolve() が実行されると、画面からインジケータを除去します。
	 *
	 * <pre>
	 * var df = $.Deferred();
	 * var indicator = h5.ui.indicator(document, {
	 * 	promises: df.promise()
	 * }).show();
	 *
	 * setTimeout(function() {
	 * 	df.resolve() // ここでイジケータが除去される
	 * }, 2000);
	 * </pre>
	 *
	 * <b>パラメータに複数のPromiseオブジェクトを指定して、done()/fail()の実行と同時にインジケータを除去する</b><br>
	 * Promiseオブジェクトを複数指定すると、全てのPromiseオブジェクトでresolve()が実行されるか、またはいずれかのPromiseオブジェクトでfail()が実行されるタイミングでインジケータを画面から除去します。
	 *
	 * <pre>
	 * var df = $.Deferred();
	 * var df2 = $.Deferred();
	 * var indicator = h5.ui.indicator(document, {
	 * 	promises: [df.promise(), df2.promise()]
	 * }).show();
	 *
	 * setTimeout(function() {
	 * 	df.resolve()
	 * }, 2000);
	 *
	 * setTimeout(function() {
	 * 	df.resolve() // ここでイジケータが除去される
	 * }, 4000);
	 * </pre>
	 *
	 * <p>
	 * コントローラのindicator()の仕様については、<a href="./Controller.html#indicator">Controller.indicator</a>のドキュメント
	 * を参照下さい。
	 *
	 * @memberOf h5.ui
	 * @name indicator
	 * @function
	 * @param {String|Object} target インジケータを表示する対象のDOM要素、jQueryオブジェクトまたはセレクタ
	 * @param {Object} [option] オプション
	 * @param {String} [option.message] スロバーの右側に表示する文字列 (デフォルト:未指定)
	 * @param {Number} [option.percent] スロバーの中央に表示する数値。0～100で指定する (デフォルト:未指定)
	 * @param {Boolean} [option.block] 画面を操作できないようオーバーレイ表示するか (true:する/false:しない) (デフォルト:true)
	 * @param {Number} [option.fadeIn] インジケータをフェードで表示する場合、表示までの時間をミリ秒(ms)で指定する (デフォルト:フェードしない)
	 * @param {Number} [option.fadeOut] インジケータをフェードで非表示にする場合、非表示までの時間をミリ秒(ms)で指定する (デフォルト:しない)
	 * @param {Promise|Promise[]} [option.promises] Promiseオブジェクト (Promiseの状態に合わせて自動でインジケータの非表示を行う)
	 * @param {String} [option.theme] テーマクラス名 (インジケータのにスタイル定義の基点となるクラス名 (デフォルト:'a')
	 * @param {String} [option.throbber.lines] スロバーの線の本数 (デフォルト:12)
	 * @param {String} [option.throbber.roundTime] スロバーの白線が1周するまでの時間(ms)
	 *            (このオプションはCSS3Animationを未サポートブラウザのみ有効) (デフォルト:1000)
	 * @see Indicator
	 * @see Controller.indicator
	 */
	var indicator = function(target, option) {
		return new Indicator(target, option);
	};

	/**
	 * 要素が可視範囲内、または指定した親要素内にあるかどうかを返します。
	 * <p>
	 * 第2引数を省略した場合、要素がウィンドウ内に見えているかどうかを返します。 elementが他のDOM要素によって隠れていても、範囲内にあればtrueを返します。
	 * </p>
	 * <p>
	 * 第2引数を指定した場合、elementがcontainerの表示範囲内で見えているかどうかを返します。 containerがウィンドウ内に見えているかどうかは関係ありません。
	 * elementがcontainerの子孫要素で無ければundefinedを返します。
	 * </p>
	 * <p>
	 * ブラウザで拡大/縮小を行っていた場合、僅かな誤差のために結果が異なる場合があります。
	 * </p>
	 * <p>
	 * いずれの場合も、要素が非表示の場合の動作は保障されません。
	 * </p>
	 *
	 * @param {String|Element|jQuery} element 要素
	 * @param {Object} container コンテナ
	 * @returns {Boolean} 要素が可視範囲内にあるかどうか
	 * @name isInView
	 * @function
	 * @memberOf h5.ui
	 */
	var isInView = function(element, container) {
		var viewTop,viewBottom,viewLeft,viewRight;
		var $element = $(element);
		var height,width;

		// containerの位置を取得。borderの内側の位置で判定する。
		if (container === undefined) {
			// containerが指定されていないときは、画面表示範囲内にあるかどうか判定する
			height = getDisplayArea('Height');
			width = getDisplayArea('Width');
			viewTop = scrollTop();
			viewLeft = scrollLeft();
		} else {
			var $container = $(container);
			if ($container.find($element).length === 0) {
				// elementとcontaienrが親子関係でなければundefinedを返す
				return undefined;
			}
			var containerOffset = getOffset($container);
			viewTop = containerOffset.top + parseInt($container.css('border-top-width'));
			viewLeft = containerOffset.left + parseInt($container.css('border-left-width'));
			height = $container.innerHeight();
			width = $container.innerWidth();
		}
		viewBottom = viewTop + height;
		viewRight = viewLeft + width;

		// elementの位置を取得。borderの外側の位置で判定する。
		var elementOffset = getOffset($element);
		var positionTop = elementOffset.top;
		var positionLeft = elementOffset.left;
		var positionBottom = positionTop + $element.outerHeight();
		var positionRight = positionLeft + $element.outerWidth();

		return ((viewTop <= positionTop && positionTop < viewBottom) || (viewTop < positionBottom && positionBottom <= viewBottom))
				&& ((viewLeft <= positionLeft && positionLeft < viewRight) || (viewLeft < positionRight && positionRight <= viewRight));
	};

	/**
	 * ブラウザのトップにスクロールします。
	 *
	 * @name scrollToTop
	 * @function
	 * @memberOf h5.ui
	 */
	var scrollToTop = function() {
		var waitCount = 3;

		function fnScroll() {
			if (window.scrollY === 1) {
				waitCount = 0;
			}
			if (waitCount > 0) {
				window.scrollTo(0, 1);
				waitCount--;
				setTimeout(fnScroll, WAIT_MILLIS);
			}
		}

		window.scrollTo(0, 1);
		if ($(window).scrollTop !== 1) {
			setTimeout(fnScroll, WAIT_MILLIS);
		}
	};

	// =============================
	// Expose to window
	// =============================

	h5.u.obj.expose('h5.ui', {
		indicator: indicator,
		isInView: isInView,
		scrollToTop: scrollToTop
	});
})();


/* ------ h5.ui.jqm.manager ------ */
(function() {
	// =========================================================================
	//
	// Constants
	//
	// =========================================================================

	// =============================
	// Production
	// =============================

	// エラーコード
	var ERR_CODE_INVALID_TYPE = 12000;
	var ERR_CODE_NAME_INVALID_PARAMETER = 12001;

	// =============================
	// Development Only
	// =============================

	var fwLogger = h5.log.createLogger('h5.ui.jqm.manager');
	/* del begin */
	var FW_LOG_JQM_CONTROLLER_ALREADY_INITIALIZED = '既にJQMマネージャは初期化されています。';
	var FW_LOG_CONTROLLER_DEF_ALREADY_DEFINED = '既にコントローラ"{0}"はJQMマネージャに登録されています。';
	var FW_LOG_CSS_FILE_PATH_ALREADY_DEFINED = '既にCSSファイル"{0}"はJQMマネージャに登録されています。';

	// エラーコードマップ
	var errMsgMap = {};
	errMsgMap[ERR_CODE_INVALID_TYPE] = '引数{0}が不正です。正しい値を指定して下さい。';
	errMsgMap[ERR_CODE_NAME_INVALID_PARAMETER] = '引数の指定に誤りがあります。第2引数にCSSファイルパス、第3引数にコントローラ定義オブジェクトを指定して下さい。';
	addFwErrorCodeMap(errMsgMap);
	/* del end */


	// =========================================================================
	//
	// Cache
	//
	// =========================================================================
	// =========================================================================
	//
	// Privates
	//
	// =========================================================================
	// =============================
	// Variables
	// =============================
	/**
	 * JQMControllerのインスタンス(シングルトン)
	 */
	var jqmControllerInstance = null;

	/**
	 * コントローラのマップ
	 * <p>
	 * キー：ページID、値：コントローラ定義オブジェクト
	 *
	 * @type Object
	 */
	var controllerMap = {};

	/**
	 * コントローラインスタンスのマップ
	 * <p>
	 * キー：ページID、値：コントローラインスタンスの配列
	 *
	 * @type Object
	 */
	var controllerInstanceMap = {};

	/**
	 * JQMManagerで管理する、h5.core.controller()で動的に生成されたコントローラインスタンスを保持するマップ
	 * <p>
	 * キー：ページID、値：コントローラインスタンスの配列
	 *
	 * @type Object
	 */
	var dynamicControllerInstanceMap = {};

	/**
	 * 初期化パラメータのマップ
	 * <p>
	 * キー：ページID、値：初期化パラメータの配列
	 *
	 * @type Object
	 */
	var initParamMap = {};

	/**
	 * CSSファイルのマップ
	 * <p>
	 * キー：ページID、値：CSSファイルパスのオブジェクトの配列
	 *
	 * @type Object
	 */
	var cssMap = {};

	/**
	 * h5.ui.jqm.manager.init()が呼ばれたかどうかを示すフラグ
	 *
	 * @type Boolean
	 */
	var initCalled = false;

	// =============================
	// Functions
	// =============================

	/**
	 * アクティブページに設定されているID属性の値を取得します。
	 * <p>
	 * アクティブページが存在しない、またはIDが1文字以上の文字列ではない場合nullを取得します。
	 */
	function getActivePageId() {
		var $ap = $.mobile.activePage;
		var id = $ap && $ap[0].id;
		return isString(id) && id.length > 0 ? id : null;
	}

	/**
	 * 現在のアクティブページにコントローラをバインドします。
	 */
	function bindToActivePage() {
		var id = getActivePageId();

		if (id === null) {
			return;
		}

		jqmControllerInstance.addCSS(id);
		jqmControllerInstance.bindController(id);
	}

	/**
	 * コントローラインスタンスの__nameプロパティとコントローラ定義オブジェクトの__nameプロパティを比較し、同値であるかを判定します。
	 *
	 * @param {Object[]} controllerInstances コントローラインスタンスを保持する配列
	 * @param {Object} controllerDefObj コントローラ定義オブジェクト
	 */
	function equalsControllerName(controllerInstances, controllerDefObj) {
		var ret = false;

		for ( var i = 0, len = controllerInstances.length; i < len; i++) {
			var ci = controllerInstances[i];
			if (ci && ci.__name === controllerDefObj.__name) {
				ret = true;
				break;
			}
		}

		return ret;
	}

	// 関数は関数式ではなく function myFunction(){} のように関数定義で書く

	// =========================================================================
	//
	// Body
	//
	// =========================================================================

	/**
	 * @name jqm
	 * @memberOf h5.ui
	 * @namespace
	 */
	h5.u.obj.ns('h5.ui.jqm');

	/**
	 * hifiveで使用するdata属性のプレフィックス。<br />
	 * デフォルトは"h5"。
	 *
	 * @type String
	 * @memberOf h5.ui.jqm
	 * @name dataPrefix
	 */
	h5.ui.jqm.dataPrefix = 'h5';

	/**
	 * JQMコントローラ
	 */
	var jqmController = {
		/**
		 * コントローラ名
		 *
		 * @memberOf JQMController
		 */
		__name: 'JQMController',

		/**
		 * __readyイベントのハンドラ
		 *
		 * @param {Object} context コンテキスト
		 * @memberOf JQMController
		 */
		__ready: function(context) {
			var that = this;
			$(':jqmData(role="page"), :jqmData(role="dialog")').each(function() {
				that.loadScript(this.id);
			});
		},

		/**
		 * pageinitイベントのハンドラ
		 *
		 * @param {Object} context コンテキスト
		 * @memberOf JQMController
		 */
		':jqmData(role="page"), :jqmData(role="dialog") pageinit': function(context) {
			var id = context.event.target.id;
			this.loadScript(id);
			this.addCSS(id);
			this.bindController(id);
		},

		/**
		 * pageremoveイベントのハンドラ
		 *
		 * @param {Object} context コンテキスト
		 * @memberOf JQMController
		 */
		'{document} pageremove': function(context) {
			var id = context.event.target.id;
			var controllers = controllerInstanceMap[id];
			var dynamicControllers = dynamicControllerInstanceMap[id];

			if (controllers) {
				for ( var i = 0, len = controllers.length; i < len; i++) {
					controllers[i].dispose();
				}

				controllerInstanceMap[id] = [];
			}

			if (dynamicControllers) {
				for ( var i = 0, len = dynamicControllers.length; i < len; i++) {
					dynamicControllers[i].dispose();
				}

				dynamicControllerInstanceMap[id] = [];
			}
		},

		/**
		 * pagebeforeshowイベントのハンドラ
		 *
		 * @param {Object} context コンテキスト
		 * @memberOf JQMController
		 */
		'{document} pagebeforeshow': function(context) {
			var id = context.event.target.id;
			var prop = null;

			this.addCSS(id);

			// リスナーの有効・無効の切り替え
			for (prop in controllerInstanceMap) {
				var controllers = controllerInstanceMap[prop];
				var pageControllerEnabled = id === prop;

				for ( var i = 0, len = controllers.length; i < len; i++) {
					var controller = controllers[i];
					pageControllerEnabled ? controller.enableListeners() : controller
							.disableListeners();
				}
			}

			for (prop in dynamicControllerInstanceMap) {
				var dynamicControllers = dynamicControllerInstanceMap[prop];
				var dynamicControllerEnabled = id === prop;

				for ( var i = 0, len = dynamicControllers.length; i < len; i++) {
					var dynamicController = dynamicControllers[i];
					dynamicControllerEnabled ? dynamicController.enableListeners()
							: dynamicController.disableListeners();
				}
			}
		},

		/**
		 * pagehideイベントのハンドラ
		 *
		 * @param {Object} context コンテキスト
		 * @memberOf JQMController
		 */
		'{document} pagehide': function(context) {
			this.removeCSS(context.event.target.id);
		},

		/**
		 * h5controllerboundイベントを監視しコントローラインスタンスを管理するためのイベントハンドラ
		 *
		 * @param {Object} context コンテキスト
		 * @memberOf JQMController
		 */
		'{rootElement} h5controllerbound': function(context) {
			var boundController = context.evArg;

			if (this === boundController) {
				return;
			}

			var id = getActivePageId();

			if (id === null) {
				return;
			}

			// define()でバインドしたコントローラも、h5controllerboundイベントを発火するので、
			// このイベントを発生させたコントローラが、define()によってバインドしたコントローラか判定する
			// ↑がtrue = 「既にJQMManagerの管理対象になっているコントローラ」なので、dynamicControllerInstanceMapに含めない
			if ($.inArray(boundController, controllerInstanceMap[id]) !== -1) {
				return;
			}

			if (!dynamicControllerInstanceMap[id]) {
				dynamicControllerInstanceMap[id] = [];
			}

			dynamicControllerInstanceMap[id].push(boundController);
		},

		/**
		 * 動的に生成されたコントローラがunbindまたはdisposeされた場合、JQMManagerの管理対象から除外します
		 *
		 * @param context コンテキスト
		 * @memberOf JQMController
		 */
		'{rootElement} h5controllerunbound': function(context) {
			var unboundController = context.evArg;
			var id = getActivePageId();

			if (id === null) {
				return;
			}

			var index = $.inArray(unboundController, dynamicControllerInstanceMap[id]);

			if (index === -1) {
				return;
			}

			dynamicControllerInstanceMap[id].splice(index, 1);
		},

		/**
		 * 指定されたページIDに紐付くスクリプトをロードする。
		 *
		 * @param {String} id ページID
		 * @memberOf JQMController
		 */
		loadScript: function(id) {
			var page = $('#' + id);
			var script = $.trim(page.data(this.getDataAttribute('script')));

			if (script.length === 0) {
				return;
			}

			var src = $.map(script.split(','), function(n) {
				return $.trim(n);
			});
			var async = page.data(this.getDataAttribute('async')) == true;

			return h5.u.loadScript(src, {
				async: async
			});
		},

		/**
		 * JQMコントローラが使用するdata属性にprefixを付けた属性名を返す。
		 *
		 * @param {String} attributeName 属性名
		 * @returns {String} prefixを付けた属性名
		 */
		getDataAttribute: function(attributeName) {
			var prefix = h5.ui.jqm.dataPrefix;
			if (prefix == null) {
				prefix = 'h5';
			}
			return prefix.length !== 0 ? prefix + '-' + attributeName : attributeName;
		},

		/**
		 * コントローラのバインドを行う
		 *
		 * @param {String} id ページID
		 * @memberOf JQMController
		 */
		bindController: function(id) {
			var controllerDefs = controllerMap[id];
			var initParams = initParamMap[id];

			if (!controllerDefs || controllerDefs.length === 0) {
				return;
			}

			if (!controllerInstanceMap[id]) {
				controllerInstanceMap[id] = [];
			}

			var ci = controllerInstanceMap[id];

			for ( var i = 0, len = controllerDefs.length; i < len; i++) {
				var defObj = controllerDefs[i];

				if (equalsControllerName(ci, defObj)) {
					continue;
				}

				controllerInstanceMap[id].push(h5.core.controller('#' + id, defObj, initParams[i]));
			}
		},

		/**
		 * 指定されたページIDに紐付くCSSをHEADに追加する。
		 *
		 * @param {String} id ページID
		 * @memberOf JQMController
		 */
		addCSS: function(id) {
			var src = cssMap[id];

			if (!src) {
				return;
			}

			var head = document.getElementsByTagName('head')[0];
			var linkTags = head.getElementsByTagName('link');
			var linkLen = linkTags.length;

			for ( var i = 0, srcLen = src.length; i < srcLen; i++) {
				var path = $.mobile.path.parseUrl(src[i]).filename;
				var isLoaded = false;

				for ( var j = 0; j < linkLen; j++) {
					var loadedPath = $.mobile.path.parseUrl(linkTags[j].href).filename;

					if (loadedPath === path) {
						isLoaded = true;
						break;
					}
				}

				if (isLoaded) {
					continue;
				}

				var cssNode = document.createElement('link');
				cssNode.type = 'text/css';
				cssNode.rel = 'stylesheet';
				cssNode.href = src[i];
				head.appendChild(cssNode);
			}
		},

		/**
		 * 指定されたページIDに紐付くCSSを削除する。
		 *
		 * @param {String} id ページID
		 * @memberOf JQMController
		 */
		removeCSS: function(id) {
			var fromPageCSS = cssMap[id];

			if (!fromPageCSS) {
				return;
			}

			var id = getActivePageId();

			if (id === null) {
				return;
			}

			var toPageCSS = cssMap[id];

			$('link').filter(function() {
				var href = $(this).attr('href');
				// 遷移元のページで使用していたCSSファイルを、遷移先のページでも使用する場合はremoveしない
				return $.inArray(href, fromPageCSS) !== -1 && $.inArray(href, toPageCSS) === -1;
			}).remove();
		}
	};

	// =============================
	// Expose to window
	// =============================

	/**
	 * jQuery Mobile専用コントローラマネージャ (JQM Manager)
	 * <p>
	 * 現在表示されているページ(アクティブページ)に指定したコントローラとCSSファイルを読み込むという定義を行うことにより、 jQuery
	 * Mobile特有のページのライフサイクル(DOM生成や破棄)にあわせて、ページに対して
	 * <ul>
	 * <li>コントローラで定義したハンドラ</li>
	 * <li>スタイル(CSSファイル)</li>
	 * </ul>
	 * の有効・無効化を行います。
	 * <p>
	 * JQM Managerはページ内で動的に作成した(h5.core.controller()で生成した)コントローラも管理します。<br>
	 * 動的に生成したコントローラもページに紐づくものとして管理し、define()で生成したコントローラと同様に、ページの遷移によってハンドラとスタイルの有効・無効化を行います。
	 * <p>
	 * 動的に生成されたコントローラは、そのページに内で起こったユーザー操作などによって初めて作られるものと考えられるため、
	 * pageremoveイベントが発生してページが破棄されると、そのページに紐づいたコントローラのインスタンスも破棄されます。
	 *
	 * @name manager
	 * @memberOf h5.ui.jqm
	 * @namespace
	 */
	h5.u.obj.expose('h5.ui.jqm.manager',
			{

				/**
				 * jQuery Mobile用hifiveコントローラマネージャを初期化します。
				 * <p>
				 * 2回目以降は何も処理を行いません。
				 *
				 * @memberOf h5.ui.jqm.manager
				 * @function
				 * @name init
				 */
				init: function() {
					if (initCalled) {
						fwLogger.info(FW_LOG_JQM_CONTROLLER_ALREADY_INITIALIZED);
						return;
					}
					initCalled = true;
					$(function() {
						jqmControllerInstance = h5internal.core.controllerInternal('body',
								jqmController, null, {
									managed: false
								});
						bindToActivePage();
					});
				},

				/**
				 * jQuery Mobile用hifiveコントローラマネージャにコントローラを登録します。
				 * <p>
				 * 「data-role="page"」または「data-role="dialog"」の属性が指定された要素でかつ、
				 * idが第1引数で指定されたものに一致する要素に対してコントローラを登録します。
				 * <p>
				 * 1つのページに複数コントローラを登録することもできます。<br>
				 * 以下のように、登録したいコントローラ定義オブジェクトの数分、define()を実行して下さい。
				 *
				 * <pre>
				 * h5.ui.jqm.manager.define('pageA', 'css/pageA.css', controllerDefA, defAParams);
				 * h5.ui.jqm.manager.define('pageA', 'css/pageA.css', controllerDefB, defBParams);
				 * </pre>
				 *
				 * 注意:<br>
				 * ただし、ページに同じコントローラを2つ以上バインドすることはできません。<br>
				 * 同じコントローラであるかの判定は、コントローラ定義オブジェクトの<b>__name</b>プロパティの値がバインド済みのコントローラと同値であるか比較し、同値の場合はバインドされません。
				 *
				 * @param {String} id ページID
				 * @param {String|String[]} [cssSrc] CSSファイルのパス
				 * @param {Object} [controllerDefObject] コントローラ定義オブジェクト
				 * @param {Object} [initParam] 初期化パラメータ (ライフサイクルイベント(__construct, __init,
				 *            __ready)の引数にargsプロパティとして渡されます)
				 * @memberOf h5.ui.jqm.manager
				 * @function
				 * @name define
				 */
				define: function(id, cssSrc, controllerDefObject, initParam) {
					if (!isString(id)) {
						throwFwError(ERR_CODE_INVALID_TYPE, 'id');
					}

					if (cssSrc != null && !isString(cssSrc) && !$.isArray(cssSrc)) {
						throwFwError(ERR_CODE_INVALID_TYPE, 'cssSrc');
					}

					if (controllerDefObject != null) {
						if (isString(controllerDefObject) || $.isArray(controllerDefObject)) {
							throwFwError(ERR_CODE_NAME_INVALID_PARAMETER);
						}

						if (!$.isPlainObject(controllerDefObject)
								|| !('__name' in controllerDefObject)) {
							throwFwError(ERR_CODE_INVALID_TYPE, 'controllerDefObject');
						}

						if (initParam != null && !$.isPlainObject(initParam)) {
							throwFwError(ERR_CODE_INVALID_TYPE, 'initParam');
						}
					}

					if (!cssMap[id]) {
						cssMap[id] = [];
					}

					if (!controllerMap[id]) {
						controllerMap[id] = [];
					}

					if (!initParamMap[id]) {
						initParamMap[id] = [];
					}

					$.merge(cssMap[id], $.map($.makeArray(cssSrc), function(val, i) {
						if ($.inArray(val, cssMap[id]) !== -1) {
							fwLogger.info(FW_LOG_CSS_FILE_PATH_ALREADY_DEFINED, val);
							return null;
						}
						return val;
					}));

					if (controllerDefObject) {
						if ($.inArray(controllerDefObject, controllerMap[id]) === -1) {
							controllerMap[id].push(controllerDefObject);
							initParamMap[id].push(initParam);
						} else {
							fwLogger.info(FW_LOG_CONTROLLER_DEF_ALREADY_DEFINED,
									controllerDefObject.__name);
						}
					}

					if (getActivePageId() !== null && jqmControllerInstance) {
						bindToActivePage();
					} else {
						this.init();
					}
				}
				/* del begin */
				,
				/*
				 * テスト用に公開
				 * JQMControllerが管理しているコントローラへの参照と、JQMControllerインスタンスへの参照を除去し、JQMControllerをdisposeをします。
				 *
				 * @memberOf h5.ui.jqm.manager
				 * @function
				 * @name __reset
				 */
				__reset: function() {
					if (jqmControllerInstance) {
						jqmControllerInstance.dispose();
						jqmControllerInstance = null;
					}
					controllerMap = {};
					controllerInstanceMap = {};
					dynamicControllerInstanceMap = {};
					initParamMap = {};
					cssMap = {};
					initCalled = false;
				}
			/* del end */
			});
})();

/* ------ h5.api.geo ------ */
(function() {
	// =========================================================================
	//
	// Constants
	//
	// =========================================================================

	// =============================
	// Production
	// =============================

	/** エラコード: 指定された緯度または経度の値が不正 */
	var ERR_CODE_INVALID_COORDS = 2000;
	/** エラーコード: getDistance()で、指定された計算モードの定数が不正 */
	var ERR_CODE_INVALID_GEOSYSTEM_CONSTANT = 2001;
	/** エラーコード: 位置情報の取得に失敗 */
	var ERR_CODE_POSITIONING_FAILURE = 2002;

	// =============================
	// Development Only
	// =============================

	/* del begin */
	var errMsgMap = {};
	errMsgMap[ERR_CODE_INVALID_COORDS] = '正しい緯度または経度を指定して下さい。';
	errMsgMap[ERR_CODE_INVALID_GEOSYSTEM_CONSTANT] = '正しい計算モード定数を指定して下さい';
	errMsgMap[ERR_CODE_POSITIONING_FAILURE] = '位置情報の取得に失敗しました。';
	addFwErrorCodeMap(errMsgMap);
	/* del end */

	// =========================================================================
	//
	// Cache
	//
	// =========================================================================
	// navigator.geolocationをキャッシュする変数
	var geo = null;
	function getGeo() {
		if (!geo) {
			geo = navigator.geolocation;
		}
		return geo;
	}

	var h5ua = h5.env.ua;

	// =========================================================================
	//
	// Privates
	//
	// =========================================================================

	// =============================
	// Variables
	// =============================

	// =============================
	// Functions
	// =============================

	// =========================================================================
	//
	// Body
	//
	// =========================================================================

	/**
	 * h5.api.geo.getDistance() の計算モードを指定するための定数クラス
	 * <p>
	 * このオブジェクトは自分でnewすることはありません。以下のオブジェクトにアクセスするとインスタンスが返されます。
	 * </p>
	 * <ul>
	 * <li>h5.api.geo.GS_GRS80</li>
	 * <li>h5.api.geo.GS_BESSEL</li>
	 * </ul>
	 *
	 * @class
	 * @name GeodeticSystemEnum
	 */
	function GeodeticSystemEnum(oblateness, semiMajorAxis) {
		// 扁平率
		this.oblateness = oblateness;
		// 長(赤道)半径
		this.semiMajorAxis = semiMajorAxis;
	}
	/**
	 * 扁平率を取得します。
	 *
	 * @memberOf GeodeticSystemEnum
	 * @name getOblateness
	 * @returns {Number} 扁平率
	 */
	GeodeticSystemEnum.prototype.getOblateness = function() {
		return this.oblateness;
	};
	/**
	 * 長(赤道)半径を取得します。
	 *
	 * @memberOf GeodeticSystemEnum
	 * @name getSemiMajorAxis
	 * @returns {Number} 長(赤道)半径
	 */
	GeodeticSystemEnum.prototype.getSemiMajorAxis = function() {
		return this.semiMajorAxis;
	};

	/** 計算モード: 世界測地系(GRS80) */
	var GRS80 = new GeodeticSystemEnum(298.257222, 6378137);
	/** 計算モード: 日本測地系(BESSEL) */
	var BESSEL = new GeodeticSystemEnum(299.152813, 6377397.155);
	/** ラジアン毎秒 - 1度毎秒 */
	var DEGREES_PER_SECOND = Math.PI / 180;

	/**
	 * Geolocation API
	 *
	 * @memberOf h5.api
	 * @name geo
	 * @namespace
	 */
	function Geolocation() {
	// 空コンストラクタ
	}

	$.extend(Geolocation.prototype, {
		/**
		 * Geolocation APIが使用可能であるかの判定結果<br>
		 *
		 * @type Boolean
		 * @memberOf h5.api.geo
		 * @name isSupported
		 */
		// IE9の場合、navigator.geolocationにアクセスするとメモリーリークするのでエージェントで利用可能か判定する
		isSupported: (h5ua.isIE && h5ua.browserVersion >= 9) ? true : !!getGeo(),
		/**
		 * 現在地の緯度・経度を取得します。
		 *
		 * @memberOf h5.api.geo
		 * @name getCurrentPosition
		 * @function
		 * @param {Object} [option] 設定情報
		 * @param {Boolean} [option.enableHighAccuracy] 正確な位置を取得するか (ただし消費電力の増加や応答が遅延する)
		 * @param {Number} [option.timeout] 位置情報を取得するまで待機する時間 (ミリ秒)
		 * @param {Number} [option.maximumAge] キャッシュされた位置情報の有効期間を指定する (ミリ秒)
		 * @returns {Promise} Promiseオブジェクト
		 */
		getCurrentPosition: function(option) {
			var dfd = h5.async.deferred();
			getGeo().getCurrentPosition(function(geoPosition) {
				dfd.resolve(geoPosition);
			}, function(e) {
				dfd.reject(createRejectReason(ERR_CODE_POSITIONING_FAILURE, null, e));
			}, option);
			return dfd.promise();
		},
		/**
		 * 現在地の緯度・経度を定期的に送信します。
		 * <p>
		 * このメソッドは定期的に位置情報を取得するため、Deferred.progress()で値を取得します。<br>
		 * (Deferred.done()では値を取得できません。)
		 * <p>
		 * <b>実装例</b><br>
		 *
		 * <pre>
		 * h5.api.geo.watchPosition().progress(function(pos) {
		 * // 変数 pos に位置情報が格納されている。
		 * 		});
		 * </pre>
		 *
		 * @memberOf h5.api.geo
		 * @name watchPosition
		 * @function
		 * @param {Object} [option] 設定情報
		 * @param {Boolean} [option.enableHighAccuracy] 正確な位置を取得するか (ただし消費電力の増加や応答が遅延する)
		 * @param {Number} [option.timeout] 位置情報を取得するまで待機する時間 (ミリ秒)
		 * @param {Number} [option.maximumAge] キャッシュされた位置情報の有効期間を指定する (ミリ秒)
		 * @returns {WatchPositionPromise} WatchPositionPromiseオブジェクト
		 */
		watchPosition: function(option) {
			var dfd = h5.async.deferred();
			var id = getGeo().watchPosition(function(pos) {
				dfd.notify(pos);
			}, function(e) {
				dfd.reject(createRejectReason(ERR_CODE_POSITIONING_FAILURE, null, e));
			}, option);
			/**
			 * h5.api.geo.watchPositionがこのオブジェクトをプロミス化して返します。
			 * <p>
			 * このオブジェクトは自分でnewすることはありません。<b>h5.api.geo.watchPosition</b>関数を呼び出すとインスタンスが返されます。
			 * </p>
			 *
			 * @class
			 * @name WatchPositionPromise
			 */
			function WatchPositionPromise() {
			// 空コンストラクタ
			}
			/**
			 * h5.api.geo.watchPositionで行っているユーザの位置監視を終了します。
			 * <p>
			 * ユーザの位置監視を終了し、Deferred.done()が実行されます。
			 * </p>
			 *
			 * @memberOf WatchPositionPromise
			 * @name unwatch
			 */
			WatchPositionPromise.prototype.unwatch = function() {
				getGeo().clearWatch(id);
				dfd.resolve();
			};
			return dfd.promise(new WatchPositionPromise());
		},
		/**
		 * ヒュベニの法則を使用して、2点間の緯度・経度から直線距離(m)を取得します。
		 * <p>
		 * 定数に使用している長半径・扁平率は国土地理院で紹介されている値を使用。
		 * <p>
		 * 注意:アルゴリズム上、長距離(100km以上)の地点を図る場合1m以上の誤差が出てしまいます。
		 * <h4>計算モードの指定方法</h4>
		 * 計算モードの指定は以下の定数クラスを使用します。<br>
		 * <table border="1">
		 * <tr>
		 * <td>h5.api.geo.GS_GRS80</td>
		 * <td>世界測地系</td>
		 * </tr>
		 * <tr>
		 * <td>h5.api.geo.GS_BESSEL</td>
		 * <td>日本測地系</td>
		 * </tr>
		 * </table>
		 *
		 * @memberOf h5.api.geo
		 * @name getDistance
		 * @function
		 * @param {Number} lat1 地点1の緯度
		 * @param {Number} lng1 地点1の経度
		 * @param {Number} lat2 地点2の緯度
		 * @param {Number} lng2 地点2の経度
		 * @param {GeodeticSystemEnum} [geoSystem] 計算モード定数
		 *            (h5.api.geo.GS_GRS80:世界測地系(未指定の場合このモードで計算する) / h5.api.geo.GS_BESSEL: 日本測地系)
		 * @returns {Number} 2点間の直線距離
		 */
		// TODO 長距離の場合も考えて、距離によって誤差が大きくならない『測地線航海算法』で計算するメソッドの追加も要検討
		getDistance: function(lat1, lng1, lat2, lng2, geoSystem) {
			if (!isFinite(lat1) || !isFinite(lng1) || !isFinite(lat2) || !isFinite(lng2)) {
				throwFwError(ERR_CODE_INVALID_COORDS);
			}
			var geodeticMode = geoSystem ? geoSystem : GRS80;
			if (!(geodeticMode instanceof GeodeticSystemEnum)) {
				throwFwError(ERR_CODE_INVALID_GEOSYSTEM_CONSTANT);
			}
			// 長半径(赤道半径)
			var A = geodeticMode.getSemiMajorAxis();
			// 扁平率
			var O = geodeticMode.getOblateness();
			// 起点の緯度のラジアン
			var latRad1 = lat1 * DEGREES_PER_SECOND;
			// 起点の経度のラジアン
			var lngRad1 = lng1 * DEGREES_PER_SECOND;
			// 終点の緯度のラジアン
			var latRad2 = lat2 * DEGREES_PER_SECOND;
			// 終点の経度のラジアン
			var lngRad2 = lng2 * DEGREES_PER_SECOND;
			// 2点の平均緯度
			var avgLat = (latRad1 + latRad2) / 2;
			// 第一離心率
			var e = (Math.sqrt(2 * O - 1)) / O;
			var e2 = Math.pow(e, 2);
			var W = Math.sqrt(1 - e2 * Math.pow(Math.sin(avgLat), 2));
			// 短半径(極半径)
			var semiminorAxis = A * (1 - e2);
			// 子午線曲率半径
			var M = semiminorAxis / Math.pow(W, 3);
			// 卯酉船曲率半径
			var N = A / W;
			// 2点の緯度差
			var deltaLat = latRad1 - latRad2;
			// 2点の経度差
			var deltaLon = lngRad1 - lngRad2;
			return Math.sqrt(Math.pow(M * deltaLat, 2)
					+ Math.pow(N * Math.cos(avgLat) * deltaLon, 2));
		},
		/**
		 * getDistanceメソッドで使用する計算モード定数 (世界測地系:GRS80)
		 *
		 * @constant
		 * @memberOf h5.api.geo
		 * @name GS_GRS80
		 */
		GS_GRS80: GRS80,
		/**
		 * getDistanceメソッドで使用する計算モード定数 (日本測地系:BESSEL)
		 *
		 * @constant
		 * @memberOf h5.api.geo
		 * @name GS_BESSEL
		 */
		GS_BESSEL: BESSEL
	});

	// =============================
	// Expose to window
	// =============================

	h5.u.obj.expose('h5.api', {
		geo: new Geolocation()
	});
})();

/* ------ h5.api.sqldb ------ */
(function() {
	// =========================================================================
	//
	// Constants
	//
	// =========================================================================

	// =============================
	// Production
	// =============================

	/** INSERT フォーマット */
	var INSERT_SQL_FORMAT = 'INSERT INTO {0} ({1}) VALUES ({2})';
	/** INSERT フォーマット(VALUES未指定) */
	var INSERT_SQL_EMPTY_VALUES = 'INSERT INTO {0} DEFAULT VALUES';
	/** SELECT フォーマット */
	var SELECT_SQL_FORMAT = 'SELECT {0} FROM {1}';
	/** UPDATE フォーマット */
	var UPDATE_SQL_FORMAT = 'UPDATE {0} SET {1}';
	/** DELETE フォーマット */
	var DELETE_SQL_FORMAT = 'DELETE FROM {0}';


	/** エラーコード: Insert/Sql/Del/Update/Select オブジェクトのexecute()が複数回実行された */
	var ERR_CODE_RETRY_SQL = 3000;
	/** エラーコード: 指定されたテーブル名が不正 */
	var ERR_CODE_INVALID_TABLE_NAME = 3001;
	/** エラーコード: 指定されたトランザクションの型が不正 */
	var ERR_CODE_INVALID_TRANSACTION_TYPE = 3002;
	/** エラーコード: where句に指定されたオペレータ文字列が不正 */
	var ERR_CODE_INVALID_OPERATOR = 3003;
	/** エラーコード: 引数で指定された型が不正 */
	var ERR_CODE_INVALID_PARAM_TYPE = 3004;
	/** エラーコード: 指定した取得カラム名が不正 */
	var ERR_CODE_INVALID_COLUMN_NAME = 3005;
	/** エラーコード: 指定したパラメータが不正 */
	var ERR_CODE_INVALID_VALUES = 3006;
	/** エラーコード: SQLのステートメントが不正 */
	var ERR_CODE_INVALID_STATEMENT = 3007;
	/** エラーコード: パラメータに指定したオブジェクトの型が不正 */
	var ERR_CODE_TYPE_NOT_ARRAY = 3008;
	/** エラーコード: transaction.add()に指定したオブジェクトの型が不正 */
	var ERR_CODE_INVALID_TRANSACTION_TARGET = 3009;
	/** エラーコード: トランザクション処理失敗 */
	var ERR_CODE_TRANSACTION_PROCESSING_FAILURE = 3010;
	/** エラーコード: where句に指定されたカラム名が不正 */
	var ERR_CODE_INVALID_COLUMN_NAME_IN_WHERE = 3011;

	// =============================
	// Development Only
	// =============================

	var fwLogger = h5.log.createLogger('h5.api.sqldb');

	/* del begin */
	var errMsgMap = {};
	errMsgMap[ERR_CODE_RETRY_SQL] = '同一オブジェクトによるSQLの再実行はできません。';
	errMsgMap[ERR_CODE_INVALID_TABLE_NAME] = '{0}: テーブル名を指定して下さい。';
	errMsgMap[ERR_CODE_INVALID_TRANSACTION_TYPE] = '{0}: トランザクションが不正です。';
	errMsgMap[ERR_CODE_INVALID_OPERATOR] = 'オペレータが不正です。 <= < >= > = != like のいずれかを使用して下さい。';
	errMsgMap[ERR_CODE_INVALID_PARAM_TYPE] = '{0}: {1}に指定したオブジェクトの型が不正です。';
	errMsgMap[ERR_CODE_INVALID_COLUMN_NAME] = '{0}: カラム名を指定して下さい。';
	errMsgMap[ERR_CODE_INVALID_VALUES] = '{0}: 値を指定して下さい。';
	errMsgMap[ERR_CODE_INVALID_STATEMENT] = '{0}: ステートメントが不正です。';
	errMsgMap[ERR_CODE_TYPE_NOT_ARRAY] = '{0}: パラメータは配列で指定して下さい。';
	errMsgMap[ERR_CODE_INVALID_TRANSACTION_TARGET] = '指定されたオブジェクトはトランザクションに追加できません。Insert/Update/Del/Select/Sqlクラスのインスタンスを指定して下さい。';
	errMsgMap[ERR_CODE_TRANSACTION_PROCESSING_FAILURE] = 'トランザクション処理中にエラーが発生しました。{0} {1}';
	errMsgMap[ERR_CODE_INVALID_COLUMN_NAME_IN_WHERE] = 'where句に指定されたカラム名が空白または空文字です。';
	addFwErrorCodeMap(errMsgMap);
	/* del end */

	// =========================================================================
	//
	// Cache
	//
	// =========================================================================
	var getDeferred = h5.async.deferred;

	// =========================================================================
	//
	// Privates
	//
	// =========================================================================

	/**
	 * SQLErrorのエラーコードに対応するメッセージを取得します。
	 */
	function getTransactionErrorMsg(e) {
		if (!e.DATABASE_ERR) {
			// Android2系、iOS4はエラーオブジェクトに定数メンバが無いのでここを通る。
			// また、codeが1固定であるため、"データベースエラー"として扱う。
			return 'データベースエラー';
		}
		switch (e.code) {
		case e.CONSTRAINT_ERR:
			return '一意制約に反しています。';
		case e.DATABASE_ERR:
			return 'データベースエラー';
		case e.QUOTA_ERR:
			return '空き容量が不足しています。';
		case e.SYNTAX_ERR:
			return '構文に誤りがあります。';
		case e.TIMEOUT_ERR:
			return 'ロック要求がタイムアウトしました。';
		case e.TOO_LARGE_ERR:
			return '取得結果の行が多すぎます。';
		case e.UNKNOWN_ERR:
			return 'トランザクション内で例外がスローされました。';
		case e.VERSION_ERR:
			return 'データベースのバージョンが一致しません。';
		}
	}

	// =============================
	// Variables
	// =============================

	// =============================
	// Functions
	// =============================
	/**
	 * トランザクションエラー時に実行する共通処理
	 */
	function transactionErrorCallback(txw, e) {
		var results = txw._tasks;
		for ( var i = results.length - 1; i >= 0; i--) {
			var result = results[i];
			var msgParam = getTransactionErrorMsg(e);
			result.deferred.reject(createRejectReason(ERR_CODE_TRANSACTION_PROCESSING_FAILURE, [
					msgParam, e.message], e));
		}
	}

	/**
	 * トランザクション完了時に実行する共通処理
	 */
	function transactionSuccessCallback(txw) {
		var results = txw._tasks;
		for ( var i = results.length - 1; i >= 0; i--) {
			var result = results[i];
			result.deferred.resolve(result.result);
		}
	}

	/**
	 * Insert/Select/Update/Del/Sql/Transactionオブジェクトのexecute()が二度を呼び出された場合、例外をスローする
	 */
	function checkSqlExecuted(flag) {
		if (flag) {
			throwFwError(ERR_CODE_RETRY_SQL);
		}
	}

	/**
	 * DatabaseWrapper.select()/insert()/update()/del() のパラメータチェック
	 * <p>
	 * tableNameが未指定またはString型以外の型の値が指定された場合、例外をスローします。
	 */
	function checkTableName(funcName, tableName) {
		if (!isString(tableName)) {
			throwFwError(ERR_CODE_INVALID_TABLE_NAME, funcName);
		}
	}

	/**
	 * DatabaseWrapper.select()/insert()/update()/del()/sql()/transaction() のパラメータチェック
	 * <p>
	 * txwがTransactionWrapper型ではない場合、例外をスローします。 null,undefinedの場合は例外をスローしません。
	 */
	function checkTransaction(funcName, txw) {
		if (txw != undefined && !(txw instanceof SQLTransactionWrapper)) {
			throwFwError(ERR_CODE_INVALID_TRANSACTION_TYPE, funcName);
		}
	}

	/**
	 * 条件を保持するオブジェクトから、SQLのプレースホルダを含むWHERE文とパラメータの配列を生成します。
	 */
	function createConditionAndParameters(whereObj, conditions, parameters) {
		if ($.isPlainObject(whereObj)) {
			for ( var prop in whereObj) {
				var params = $.trim(prop).replace(/ +/g, ' ').split(' ');
				var param = [];

				if (params[0] === "") {
					throwFwError(ERR_CODE_INVALID_COLUMN_NAME_IN_WHERE);
				} else if (params.length === 1) {
					param.push(params[0]);
					param.push('=');
					param.push('?');
				} else if (!/^(<=|<|>=|>|=|!=|like)$/i.test(params[1])) {
					throwFwError(ERR_CODE_INVALID_OPERATOR);
				} else if (params.length === 3 && /^like$/i.test(params[1])) {
					param.push(params[0]);
					param.push(params[1]);
					param.push('?');
					param.push('ESCAPE');
					param.push('\"' + params[2] + '\"');
				} else {
					param.push(params[0]);
					param.push(params[1]);
					param.push('?');
				}

				conditions.push(param.join(' '));
				parameters.push(whereObj[prop]);
			}
		}
	}

	/**
	 * マーカークラス
	 * <p>
	 * このクラスを継承しているクラスはTransaction.add()で追加できる。
	 */
	function SqlExecutor() {
	// 空コンストラクタ
	}

	// =========================================================================
	//
	// Body
	//
	// =========================================================================

	/**
	 * SQLTransaction拡張クラス
	 * <p>
	 * このオブジェクトは自分でnewすることはありません。<br>
	 * Insert/Select/Update/Del/Sql/Transactionオブジェクトのexecute()が返す、Promiseオブジェクトのprogress()の引数に存在します。
	 *
	 * @class
	 * @name SQLTransactionWrapper
	 */
	function SQLTransactionWrapper(db, tx) {
		this._db = db;
		this._tx = tx;
		this._tasks = [];
	}

	$.extend(SQLTransactionWrapper.prototype, {
		/**
		 * トランザクション処理中か判定します。
		 *
		 * @private
		 * @memberOf SQLTransactionWrapper
		 * @function
		 * @returns {Boolean} true:実行中 / false: 未実行
		 */
		_runTransaction: function() {
			return this._tx != null;
		},
		/**
		 * トランザクション処理中か判定し、未処理の場合はトランザクションの開始を、処理中の場合はSQLの実行を行います。
		 *
		 * @private
		 * @memberOf SQLTransactionWrapper
		 * @function
		 * @param {String|Function} param1 パラメータ1
		 * @param {String|Function} param2 パラメータ2
		 * @param {Function} param3 パラメータ3
		 */
		_execute: function(param1, param2, param3) {
			this._runTransaction() ? this._tx.executeSql(param1, param2, param3) : this._db
					.transaction(param1, param2, param3);
		},
		/**
		 * トランザクション内で実行中のDeferredオブジェクトを管理対象として追加します。
		 *
		 * @private
		 * @memberOf SQLTransactionWrapper
		 * @function
		 * @param {Deferred} df Deferredオブジェクト
		 */
		_addTask: function(df) {
			this._tasks.push({
				deferred: df,
				result: null
			});
		},
		/**
		 * SQLの実行結果を設定します。
		 *
		 * @private
		 * @memberOf SQLTransactionWrapper
		 * @function
		 * @param {Any} resul SQL実行結果
		 */
		_setResult: function(result) {
			this._tasks[this._tasks.length - 1].result = result;
		}
	});

	/**
	 * SELECT文とパラメータ配列を生成します。
	 */
	function createSelectStatementAndParameters(params, tableName, column, where, orderBy) {
		var statement = h5.u.str.format(SELECT_SQL_FORMAT, column, tableName);

		if ($.isPlainObject(where)) {
			var conditions = [];
			createConditionAndParameters(where, conditions, params);
			statement += (' WHERE ' + conditions.join(' AND '));
		} else if (isString(where)) {
			statement += (' WHERE ' + where);
		}

		if ($.isArray(orderBy)) {
			statement += (' ORDER BY ' + orderBy.join(', '));
		}

		return statement;
	}

	/**
	 * 指定されたテーブルに対して、検索処理(SELECT)を行うクラス。
	 * <p>
	 * このオブジェクトは自分でnewすることはありません。<br>
	 * <b>h5.api.sqldb.open().select()</b>を呼び出すと、このクラスのインスタンスが返されます。
	 *
	 * @class
	 * @name Select
	 */
	function Select(txw, tableName, columns) {
		this._txw = txw;
		this._tableName = tableName;
		this._columns = $.isArray(columns) ? columns.join(', ') : '*';
		this._where = null;
		this._orderBy = null;
		this._statement = null;
		this._params = [];
		this._df = getDeferred();
		this._executed = false;
	}

	Select.prototype = new SqlExecutor();
	$.extend(Select.prototype, {
		/**
		 * WHERE句を設定します。
		 * <p>
		 * <b>条件は以下の方法で設定できます。</b><br>
		 * <ul>
		 * <li>オブジェクト</li>
		 * <li>文字列</li>
		 * </ul>
		 * <b>オブジェクト</b>の場合、キーに『<b>カラム名[半角スペース]オペレータ</b>』、バリューに<b>値</b>を指定します。
		 * <p>
		 * 例. IDが0以上100以下。
		 *
		 * <pre>
		 * db.select('USER', '*').where({
		 * 	'ID &gt;': 0,
		 * 	'ID &lt;=': 100
		 * })
		 * </pre>
		 *
		 * オペレータで使用可能な文字は以下の通りです。
		 * <ul>
		 * <li> &lt;=</li>
		 * <li> &lt;</li>
		 * <li> &gt;=</li>
		 * <li> &gt;</li>
		 * <li> =</li>
		 * <li> !=</li>
		 * <li> like (sqliteの仕様上大文字・小文字を区別しない)</li>
		 * </ul>
		 * 条件を複数指定した場合、全てAND句で結合されます。 AND句以外の条件で結合したい場合は<b>文字列</b>で条件を指定して下さい。
		 * <p>
		 * <b>エスケープ文字の指定方法</b><br>
		 * キーに『<b>カラム名[半角スペース]オペレータ[半角スペース]エスケープ文字</b>』のように指定します。 <br>
		 * エスケープ文字はクォートやダブルクォートで囲わず、エスケープ文字のみ指定して下さい。
		 * <p>
		 * 例. $をエスケープ文字として指定する場合
		 *
		 * <pre>
		 * db.select('USER', '*').where({
		 * 	'NAME like $': 'SUZUKI$'
		 * });
		 * </pre>
		 *
		 * <p>
		 * <b>文字列</b>の場合、SQLステートメントに追加するWHERE文を指定します。
		 * <p>
		 * 例. IDが0以上100以下。
		 *
		 * <pre>
		 * db.select('USER', '*').where('ID &gt;= 10 AND ID &lt;= 100');
		 * </pre>
		 *
		 * @function
		 * @memberOf Select
		 * @param {Object|String} whereObj 条件
		 * @returns {Select} Selectオブジェクト
		 */
		where: function(whereObj) {
			if (!$.isPlainObject(whereObj) && !isString(whereObj)) {
				throwFwError(ERR_CODE_INVALID_PARAM_TYPE, ['Select', 'where']);
			}

			this._where = whereObj;
			return this;
		},
		/**
		 * ORDER BY句を設定します。
		 * <p>
		 * ソート対象のカラムが一つの場合は<b>文字列</b>、複数の場合は<b>配列</b>で指定します。
		 * <p>
		 * 例.IDを降順でソートする場合
		 *
		 * <pre>
		 * db.select('USER', '*').orderBy('ID DESC');
		 * </pre>
		 *
		 * 例.IDを降順、NAMEを昇順でソートする場合
		 *
		 * <pre>
		 * db.select('USER', '*').orderBy(['ID DESC', 'NAME ASC']);
		 * </pre>
		 *
		 * なお、複数の条件が指定されている場合、ソートは配列の先頭に指定されたカラムから順番に実行されます。
		 *
		 * @function
		 * @memberOf Select
		 * @param {Array|String} orderBy 条件
		 * @returns {Select} Selectオブジェクト
		 */
		orderBy: function(orderByObj) {
			if (!$.isPlainObject(orderByObj) && !isString(orderByObj)) {
				throwFwError(ERR_CODE_INVALID_PARAM_TYPE, ['Select', 'orderBy']);
			}

			this._orderBy = wrapInArray(orderByObj);
			return this;
		},
		/**
		 * このオブジェクトに設定された情報からSQLステートメントとパラメータを生成し、SQLを実行します。
		 * <p>
		 * 実行結果は、Promiseオブジェクトのprogress()に指定したコールバック関数または、done()に指定したコールバック関数に、<b>検索結果を保持するインスタンス</b>が返されます。
		 * <p>
		 * 検索結果へのアクセスは以下のように実行します。
		 *
		 * <pre>
		 *  db.insert('USER', {ID:10, NAME:'TANAKA'}).execute().done(function(rows) {
		 * 　rows.item(0).ID     // 検索にマッチした1件目のレコードのID
		 * 　rows.item(0).NAME   // 検索にマッチした1件目のレコードのNAME
		 *  });
		 * </pre>
		 *
		 * また、progress()に指定したコールバック関数の第二引数には、トランザクションオブジェクトが格納され、このオブジェクトを使用することで、トランザクションを引き継ぐことができます。
		 *
		 * <pre>
		 *  db.select('PRODUCT', ['ID']).where({NAME: 'ball'}).execute().progress(function(rs, tx) {
		 * 　db.update('STOCK', {PRICE: 2000}, tx).where({ID: rs.item(0).ID}).execute();
		 *  });
		 * </pre>
		 *
		 * db.select().execute()で返ってきたトランザクションを、db.update()の第三引数に指定することで、db.selec()とdb.update()は同一トランザクションで実行されます。
		 *
		 * @function
		 * @memberOf Select
		 * @returns {Promise} Promiseオブジェクト
		 */
		execute: function() {
			var that = this;
			var build = function() {
				that._statement = createSelectStatementAndParameters(that._params, that._tableName,
						that._columns, that._where, that._orderBy);
			};
			var df = getDeferred();
			var txw = this._txw;
			var executed = this._executed;
			var resultSet = null;

			try {
				txw._addTask(df);
				checkSqlExecuted(executed);
				build();
				fwLogger.debug(['Select: ' + this._statement], this._params);

				if (txw._runTransaction()) {
					txw._execute(this._statement, this._params, function(innerTx, rs) {
						resultSet = rs.rows;
						txw._setResult(resultSet);
						df.notify(resultSet, txw);
					});
				} else {
					txw._execute(function(tx) {
						txw._tx = tx;
						tx.executeSql(that._statement, that._params, function(innerTx, rs) {
							resultSet = rs.rows;
							txw._setResult(resultSet);
							df.notify(resultSet, txw);
						});
					}, function(e) {
						transactionErrorCallback(txw, e);
					}, function() {
						transactionSuccessCallback(txw);
					});
				}
			} catch (e) {
				df.reject(e);
			}

			this._executed = true;
			return df.promise();
		}
	});



	/**
	 * 指定されたテーブルに対して、登録処理(INSERT)を行うクラス。
	 * <p>
	 * このオブジェクトは自分でnewすることはありません。<br>
	 * <b>h5.api.sqldb.open().insert()</b>を呼び出すと、このクラスのインスタンスが返されます。
	 *
	 * @class
	 * @name Insert
	 */
	function Insert(txw, tableName, values) {
		this._txw = txw;
		this._tableName = tableName;
		this._values = values ? wrapInArray(values) : [];
		this._statement = [];
		this._params = [];
		this._df = getDeferred();
		this._executed = false;
	}

	Insert.prototype = new SqlExecutor();
	$.extend(Insert.prototype,
			{
				/**
				 * このオブジェクトに設定された情報からSQLステートメントとパラメータを生成し、SQLを実行します。
				 * <p>
				 * 実行結果は、Promiseオブジェクトのprogress()に指定したコールバック関数または、done()に指定したコールバック関数に、<b>登録に成功したレコードのIDを持つ配列</b>が返されます。
				 * <p>
				 * 検索結果へのアクセスは以下のように実行します。
				 *
				 * <pre>
				 *  db.insert('USER', {ID:10, NAME:'TANAKA'}).execute().done(function(rows) {
				 * 　rows.item(0).ID     // 検索にマッチした1件目のレコードのID
				 * 　rows.item(0).NAME   // 検索にマッチした1件目のレコードのNAME
				 *  });
				 * </pre>
				 *
				 * また、progress()に指定したコールバック関数の第二引数には、トランザクションオブジェクトが格納され、このオブジェクトを使用することで、トランザクションを引き継ぐことができます。
				 *
				 * <pre>
				 *  db.select('STOCK', {ID:10, NAME:'ballA'}).execute().progress(function(rs, tx) { // ※1
				 * 　db.insert('STOCK', {ID:11, NAME:'ballB'}, tx).execute(); // ※2
				 *  });
				 * </pre>
				 *
				 * ※1のprogress()で返ってきたトランザクション(tx)を、※2のinsert()の第三引数に指定することで、2つのdb.insert()は同一トランザクションで実行されます。
				 *
				 * @function
				 * @memberOf Insert
				 * @returns {Promise} Promiseオブジェクト
				 */
				execute: function() {
					var that = this;
					var build = function() {
						var valueObjs = that._values;

						if (valueObjs.length === 0) {
							that._statement.push(h5.u.str.format(INSERT_SQL_EMPTY_VALUES,
									that._tableName));
							that._params.push([]);
							return;
						}

						for ( var i = 0, len = valueObjs.length; i < len; i++) {
							var valueObj = valueObjs[i];

							if (valueObj == null) {
								that._statement.push(h5.u.str.format(INSERT_SQL_EMPTY_VALUES,
										that._tableName));
								that._params.push([]);
							} else if ($.isPlainObject(valueObj)) {
								var values = [];
								var columns = [];
								var params = [];

								for ( var prop in valueObj) {
									values.push('?');
									columns.push(prop);
									params.push(valueObj[prop]);
								}

								that._statement.push(h5.u.str.format(INSERT_SQL_FORMAT,
										that._tableName, columns.join(', '), values.join(', ')));
								that._params.push(params);
							}
						}
					};
					var df = getDeferred();
					var txw = this._txw;
					var executed = this._executed;
					var resultSet = null;
					var insertRowIds = [];
					var index = 0;

					function executeSql() {
						if (that._statement.length === index) {
							resultSet = insertRowIds;
							txw._setResult(resultSet);
							df.notify(resultSet, txw);
							return;
						}

						fwLogger.debug(['Insert: ' + that._statement[index]], that._params[index]);
						txw._execute(that._statement[index], that._params[index], function(innerTx,
								rs) {
							index++;
							insertRowIds.push(rs.insertId);
							executeSql();
						});
					}

					try {
						txw._addTask(df);
						checkSqlExecuted(executed);
						build();

						if (txw._runTransaction()) {
							executeSql();
						} else {
							txw._execute(function(tx) {
								txw._tx = tx;
								executeSql();
							}, function(e) {
								transactionErrorCallback(txw, e);
							}, function() {
								transactionSuccessCallback(txw);
							});
						}
					} catch (e) {
						df.reject(e);
					}

					this._executed = true;
					return df.promise();
				}
			});

	/**
	 * 指定されたテーブルに対して、更新処理(UPDATE)を行うクラス。
	 * <p>
	 * このオブジェクトは自分でnewすることはありません。<br>
	 * <b>h5.api.sqldb.open().update()</b>を呼び出すと、このクラスのインスタンスが返されます。
	 *
	 * @class
	 * @name Update
	 */
	function Update(txw, tableName, value) {
		this._txw = txw;
		this._tableName = tableName;
		this._value = value;
		this._where = null;
		this._statement = null;
		this._params = [];
		this._df = getDeferred();
		this._executed = false;
	}

	Update.prototype = new SqlExecutor();
	$.extend(Update.prototype, {
		/**
		 * WHERE句を設定します。
		 * <p>
		 * <b>条件は以下の方法で設定できます。</b><br>
		 * <ul>
		 * <li>オブジェク</li>
		 * <li>文字列</li>
		 * </ul>
		 * <b>オブジェクト</b>の場合、キーに『<b>カラム名[半角スペース]オペレータ</b>』、バリューに<b>値</b>を指定します。
		 * <p>
		 * 例. IDが0以上100以下。
		 *
		 * <pre>
		 * db.update('USER', {
		 * 	NAME: 'TANAKA'
		 * }).where({
		 * 	'ID &gt;': 0,
		 * 	'ID &lt;=': 100
		 * })
		 * </pre>
		 *
		 * オペレータで使用可能な文字は以下の通りです。
		 * <ul>
		 * <li> &lt;=</li>
		 * <li> &lt;</li>
		 * <li> &gt;=</li>
		 * <li> &gt;</li>
		 * <li> =</li>
		 * <li> !=</li>
		 * <li> like (sqliteの仕様上大文字・小文字を区別しない)</li>
		 * </ul>
		 * 条件を複数指定した場合、全てAND句で結合されます。 AND句以外の条件で結合したい場合は文字列で条件を指定して下さい。
		 * <p>
		 * <b>エスケープ文字の指定方法</b><br>
		 * キーに『<b>カラム名[半角スペース]オペレータ[半角スペース]エスケープ文字</b>』のように指定します。 <br>
		 * エスケープ文字はクォートやダブルクォートで囲わず、エスケープ文字のみ指定して下さい。
		 * <p>
		 * 例. $をエスケープ文字として指定する場合
		 *
		 * <pre>
		 * db.update('USER', {
		 * 	NAME: 'TANAKA'
		 * }).where({
		 * 	'NAME like $': 'SUZUKI$'
		 * });
		 * </pre>
		 *
		 * <p>
		 * <b>文字列</b>の場合、SQLステートメントに追加するWHERE文を指定します。
		 * <p>
		 * 例. IDが0以上100以下。
		 *
		 * <pre>
		 * db.update('USER').where('ID &gt;= 10 AND ID &lt;= 100')
		 * </pre>
		 *
		 * @function
		 * @memberOf Update
		 * @param {Object|String} whereObj 条件
		 * @returns {Update} Updateオブジェクト
		 */
		where: function(whereObj) {
			if (!$.isPlainObject(whereObj) && !isString(whereObj)) {
				throwFwError(ERR_CODE_INVALID_PARAM_TYPE, ['Update', 'where']);
			}

			this._where = whereObj;
			return this;
		},
		/**
		 * このオブジェクトに設定された情報からSQLステートメントとパラメータを生成し、SQLを実行します。
		 * <p>
		 * 実行結果は、Promiseオブジェクトのprogress()に指定したコールバック関数または、done()に指定したコールバック関数に、<b>更新されたレコードの件数</b>が返されます。
		 *
		 * <pre>
		 *  db.update('USER', {NAME:TANAKA}).where({ID:10}).execute().done(function(rowsAffected) {
		 *  　rowsAffected // 更新されたレコードの行数(Number型)
		 *  });
		 * </pre>
		 *
		 * また、progress()に指定したコールバック関数の第二引数には、トランザクションオブジェクトが格納され、このオブジェクトを使用することで、トランザクションを引き継ぐことができます。
		 *
		 * <pre>
		 *  db.select('PRODUCT', ['ID']).where({NAME: 'ball'}).execute().progress(function(rs, tx) {
		 * 　db.update('STOCK', {PRICE: 2000}, tx).where({ID: rs.item(0).ID}).execute();
		 *  });
		 * </pre>
		 *
		 * db.select().execute()で返ってきたトランザクションを、db.update()の第三引数に指定することで、db.select()とdb.update()は同一トランザクションで実行されます。
		 *
		 * @function
		 * @memberOf Update
		 * @returns {Promise} Promiseオブジェクト
		 */
		execute: function() {
			var that = this;
			var build = function() {
				var whereObj = that._where;
				var valueObj = that._value;
				var columns = [];

				for ( var prop in valueObj) {
					columns.push(prop + ' = ?');
					that._params.push(valueObj[prop]);
				}

				that._statement = h5.u.str.format(UPDATE_SQL_FORMAT, that._tableName, columns
						.join(', '));

				if ($.isPlainObject(whereObj)) {
					var conditions = [];
					createConditionAndParameters(whereObj, conditions, that._params);
					that._statement += (' WHERE ' + conditions.join(' AND '));
				} else if (isString(whereObj)) {
					that._statement += (' WHERE ' + whereObj);
				}
			};
			var df = getDeferred();
			var txw = this._txw;
			var executed = this._executed;
			var resultSet = null;

			try {
				txw._addTask(df);
				checkSqlExecuted(executed);
				build();
				fwLogger.debug(['Update: ' + this._statement], this._params);

				if (txw._runTransaction()) {
					txw._execute(this._statement, this._params, function(innerTx, rs) {
						resultSet = rs.rowsAffected;
						txw._setResult(resultSet);
						df.notify(resultSet, txw);
					});
				} else {
					txw._execute(function(tx) {
						txw._tx = tx;
						tx.executeSql(that._statement, that._params, function(innerTx, rs) {
							resultSet = rs.rowsAffected;
							txw._setResult(resultSet);
							df.notify(resultSet, txw);
						});
					}, function(e) {
						transactionErrorCallback(txw, e);
					}, function() {
						transactionSuccessCallback(txw);
					});
				}
			} catch (e) {
				df.reject(e);
			}

			this._executed = true;
			return df.promise();
		}
	});

	/**
	 * 指定されたテーブルに対して、削除処理(DELETE)を行うクラス。
	 * <p>
	 * このオブジェクトは自分でnewすることはありません。<br>
	 * <b>h5.api.sqldb.open().del()</b>を呼び出すと、このクラスのインスタンスが返されます。
	 * <p>
	 * <i>deleteは予約語なため、Delとしています。</i>
	 *
	 * @class
	 * @name Del
	 */
	function Del(txw, tableName) {
		this._txw = txw;
		this._tableName = tableName;
		this._where = null;
		this._statement = null;
		this._params = [];
		this._df = getDeferred();
		this._executed = false;
	}

	Del.prototype = new SqlExecutor();
	$.extend(Del.prototype, {
		/**
		 * WHERE句を設定します。
		 * <p>
		 * <b>条件は以下の方法で設定できます。</b><br>
		 * <ul>
		 * <li>オブジェクト</li>
		 * <li>文字列</li>
		 * </ul>
		 * <b>オブジェクト</b>の場合、キーに『<b>カラム名[半角スペース]オペレータ</b>』、バリューに<b>値</b>を指定します。
		 * <p>
		 * 例. IDが0以上100以下。
		 *
		 * <pre>
		 * db.delete('USER').where({'ID &gt;':0, 'ID &lt;=':100})
		 * </pre>
		 *
		 * オペレータで使用可能な文字は以下の通りです。
		 * <ul>
		 * <li> &lt;=</li>
		 * <li> &lt;</li>
		 * <li> &gt;=</li>
		 * <li> &gt;</li>
		 * <li> =</li>
		 * <li> !=</li>
		 * <li> like (sqliteの仕様上大文字・小文字を区別しない)</li>
		 * </ul>
		 * 条件を複数指定した場合、全てAND句で結合されます。 AND句以外の条件で結合したい場合は文字列で条件を指定して下さい。
		 * <p>
		 * <b>エスケープ文字の指定方法</b><br>
		 * キーに『<b>カラム名[半角スペース]オペレータ[半角スペース]エスケープ文字</b>』のように指定します。 <br>
		 * エスケープ文字はクォートやダブルクォートで囲わず、エスケープ文字のみ指定して下さい。
		 * <p>
		 * 例. $をエスケープ文字として指定する場合
		 *
		 * <pre>
		 * db.delete('USER').where({'NAME like $': 'SUZUKI$'});
		 * </pre>
		 *
		 * <p>
		 * <b>文字列</b>の場合、SQLステートメントに追加するWHERE文を指定します。
		 * <p>
		 * 例. IDが0以上100以下。
		 *
		 * <pre>
		 * db.delete('USER').where('ID &gt;= 10 AND ID &lt;= 100')
		 * </pre>
		 *
		 * @function
		 * @memberOf Del
		 * @param {Object|String} whereObj 条件
		 * @returns {Del} Delオブジェクト
		 */
		where: function(whereObj) {
			if (!$.isPlainObject(whereObj) && !isString(whereObj)) {
				throwFwError(ERR_CODE_INVALID_PARAM_TYPE, ['Del', 'where']);
			}

			this._where = whereObj;
			return this;
		},
		/**
		 * このオブジェクトに設定された情報からSQLステートメントとパラメータを生成し、SQLを実行します。
		 * <p>
		 * 実行結果は、Promiseオブジェクトのprogress()に指定したコールバック関数または、done()に指定したコールバック関数に、<b>削除されたレコードの件数</b>が返されます。
		 *
		 * <pre>
		 *  db.del('USER').where({ID:10}).execute().done(function(rowsAffected) {
		 *  　rowsAffected // 削除されたレコードの行数(Number型)
		 *  });
		 * </pre>
		 *
		 * また、progress()に指定したコールバック関数の第二引数には、トランザクションオブジェクトが格納され、このオブジェクトを使用することで、トランザクションを引き継ぐことができます。
		 *
		 * <pre>
		 *  db.select('PRODUCT', ['ID']).where({NAME: 'ball'}).execute().progress(function(rs, tx) {
		 *  　db.del('STOCK', tx).where({ID: rs.item(0).ID}).execute();
		 *  });
		 * </pre>
		 *
		 * db.select().execute()で返ってきたトランザクションを、db.del()の第二引数に指定することで、db.select()とdb.del()は同一トランザクションで実行されます。
		 *
		 * @function
		 * @memberOf Del
		 * @returns {Promise} Promiseオブジェクト
		 */
		execute: function() {
			var that = this;
			var build = function() {
				var whereObj = that._where;

				that._statement = h5.u.str.format(DELETE_SQL_FORMAT, that._tableName);

				if ($.isPlainObject(whereObj)) {
					var conditions = [];
					createConditionAndParameters(whereObj, conditions, that._params);
					that._statement += (' WHERE ' + conditions.join(' AND '));
				} else if (isString(whereObj)) {
					that._statement += (' WHERE ' + whereObj);
				}
			};
			var df = getDeferred();
			var txw = this._txw;
			var executed = this._executed;
			var resultSet = null;

			try {
				txw._addTask(df);
				checkSqlExecuted(executed);
				build();
				fwLogger.debug(['Del: ' + this._statement], this._params);

				if (txw._runTransaction()) {
					txw._execute(this._statement, this._params, function(innerTx, rs) {
						resultSet = rs.rowsAffected;
						txw._setResult(resultSet);
						df.notify(resultSet, txw);
					});
				} else {
					txw._execute(function(tx) {
						txw._tx = tx;
						tx.executeSql(that._statement, that._params, function(innerTx, rs) {
							resultSet = rs.rowsAffected;
							txw._setResult(resultSet);
							df.notify(resultSet, txw);
						});
					}, function(e) {
						transactionErrorCallback(txw, e);
					}, function() {
						transactionSuccessCallback(txw);
					});
				}
			} catch (e) {
				df.reject(e);
			}

			this._executed = true;
			return df.promise();
		}
	});

	/**
	 * 指定されたSQLステートメントを実行するクラス。
	 * <p>
	 * このオブジェクトは自分でnewすることはありません。<br>
	 * <b>h5.api.sqldb.open().sql()</b>を呼び出すと、このクラスのインスタンスが返されます。
	 *
	 * @class
	 * @name Sql
	 */
	function Sql(txw, statement, params) {
		this._txw = txw;
		this._statement = statement;
		this._params = params || [];
		this._df = getDeferred();
		this._executed = false;
	}

	Sql.prototype = new SqlExecutor();
	$.extend(Sql.prototype, {
		/**
		 * このオブジェクトに設定された情報からSQLステートメントとパラメータを生成し、SQLを実行します。
		 * <p>
		 * 実行結果は、戻り値であるPromiseオブジェクトのprogress()に指定したコールバック関数または、done()に指定したコールバック関数に、<b>実行結果を保持するオブジェクト</b>が返されます。
		 * <p>
		 * 実行結果オブジェクトは、以下のプロパティを持っています。<br>
		 * <table border="1">
		 * <tr>
		 * <td>プロパティ名</td>
		 * <td>説明</td>
		 * </tr>
		 * <tr>
		 * <td>rows</td>
		 * <td>検索(SELECT)を実行した場合、このプロパティに結果が格納されます。</td>
		 * </tr>
		 * <tr>
		 * <td>insertId</td>
		 * <td>登録(INSERT)を実行した場合、このプロパティに登録したレコードのIDが格納されます。</td>
		 * </tr>
		 * <tr>
		 * <td>rowsAffected</td>
		 * <td>削除(DELETE)や更新(UPDATE)した場合、このプロパティに変更のあったレコードの件数が格納されます。</td>
		 * </tr>
		 * </table>
		 * <p>
		 * 例.検索結果の取得
		 *
		 * <pre>
		 *  db.sql('SELECT * FROM USER').execute().done(function(rs) {
		 *  　rs.rows          // SQLResultSetRowList
		 *  　rs.insertId      // Number
		 *  　rs.rowsAffected  // Number
		 *  });
		 * </pre>
		 *
		 * <p>
		 * <b>SQLResultSetRowList</b>は、以下のプロパティを持っています。<br>
		 * <table border="1">
		 * <tr>
		 * <td>プロパティ名</td>
		 * <td>説明</td>
		 * </tr>
		 * <tr>
		 * <td>length</td>
		 * <td>検索にマッチしたレコードの件数</td>
		 * </tr>
		 * <tr>
		 * <td>rows</td>
		 * <td>検索結果</td>
		 * </tr>
		 * </table>
		 * <p>
		 * 例.検索結果の取得する
		 *
		 * <pre>
		 *  db.sql('SELECT ID, NAME FROM USER').execute().done(function(rs) {
		 * 　rs.rows.item(0).ID     // 検索にマッチした1件目のレコードのID
		 * 　rs.rows.item(0).NAME   // 検索にマッチした1件目のレコードのNAME
		 *  });
		 * </pre>
		 *
		 * また、progress()に指定したコールバック関数の第二引数には、トランザクションオブジェクトが格納され、このオブジェクトを使用することで、トランザクションを引き継ぐことができます。
		 * <p>
		 * 例.同一トランザクションでdb.insert()とdb.sql()を実行する
		 *
		 * <pre>
		 *  db.select('PRODUCT', ['ID']).where({NAME: 'ball'}).execute().progress(function(rs, tx) {
		 * 　db.sql('UPDATE STOCK SET PRICE = 2000', tx).where({ID: rs.item(0).ID}).execute();
		 *  });
		 * </pre>
		 *
		 * db.select().execute()で返ってきたトランザクションを、db.sql()の第三引数に指定することで、db.select()とdb.sql()は同一トランザクションで実行されます。
		 *
		 * @function
		 * @memberOf Sql
		 * @returns {Promise} Promiseオブジェクト
		 */
		execute: function() {
			var df = getDeferred();
			var txw = this._txw;
			var executed = this._executed;
			var statement = this._statement;
			var params = this._params;
			var resultSet = null;

			try {
				txw._addTask(df);
				checkSqlExecuted(executed);
				fwLogger.debug(['Sql: ' + statement], params);

				if (txw._runTransaction()) {
					txw._execute(statement, params, function(tx, rs) {
						resultSet = rs;
						txw._setResult(resultSet);
						df.notify(resultSet, txw);
					});
				} else {
					txw._execute(function(tx) {
						txw._tx = tx;
						tx.executeSql(statement, params, function(innerTx, rs) {
							resultSet = rs;
							txw._setResult(resultSet);
							df.notify(resultSet, txw);
						});
					}, function(e) {
						transactionErrorCallback(txw, e);
					}, function() {
						transactionSuccessCallback(txw);
					});
				}
			} catch (e) {
				df.reject(e);
			}

			this._executed = true;
			return df.promise();
		}
	});

	/**
	 * 指定された複数のSQLを同一トランザクションで実行するクラス。
	 * <p>
	 * このオブジェクトは自分でnewすることはありません。<br>
	 * <b>h5.api.sqldb.open().transaction()</b>を呼び出すと、このクラスのインスタンスが返されます。
	 *
	 * @class
	 * @name Transaction
	 */
	function Transaction(txw) {
		this._txw = txw;
		this._queue = [];
		this._df = getDeferred();
		this._executed = false;
	}

	Transaction.prototype = new SqlExecutor();
	$.extend(Transaction.prototype, {
		/**
		 * 1トランザクションで処理したいSQLをタスクに追加します。
		 * <p>
		 * このメソッドには、以下のクラスのインスタンスを追加することができます。
		 * <ul>
		 * <li><a href="Insert.html">Insert</a></li>
		 * <li><a href="Update.html">Update</a></li>
		 * <li><a href="Del.html">Del</a></li>
		 * <li><a href="Select.html">Select</a></li>
		 * <li><a href="Sql.html">Sql</a></li>
		 * </ul>
		 *
		 * @function
		 * @memberOf Transaction
		 * @param {Any} task Insert/Update/Del/Select/Sqlクラスのインスタンス
		 * @return {Transaction} Transactionオブジェクト
		 */
		add: function(task) {
			if (!(task instanceof SqlExecutor)) {
				throwFwError(ERR_CODE_INVALID_TRANSACTION_TARGET);
			}
			this._queue.push(task);
			return this;
		},
		/**
		 * add()で追加された順にSQLを実行します。
		 * <p>
		 * 実行結果は、戻り値であるPromiseオブジェクトのprogress()に指定したコールバック関数、またはdone()に指定したコールバック関数に返されます。
		 *
		 * <pre>
		 *  db.transaction()
		 *   .add(db.insert('USER', {ID:10, NAME:TANAKA}))
		 *   .add(db.insert('USER', {ID:11, NAME:YOSHIDA}))
		 *   .add(db.insert('USER', {ID:12, NAME:SUZUKI})).execute().done(function(rs) {
		 *  　rs // 第一引数: 実行結果
		 *  });
		 * </pre>
		 *
		 * 実行結果は<b>配列(Array)</b>で返され、結果の格納順序は、<b>add()で追加した順序</b>に依存します。<br>
		 * 上記例の場合、3件 db.insert()をadd()で追加しているので、実行結果rsには3つのROWIDが格納されています。( [1, 2, 3]のような構造になっている )
		 * <p>
		 * また、progress()に指定したコールバック関数の第二引数には、トランザクションオブジェクトが格納され、このオブジェクトを使用することで、トランザクションを引き継ぐことができます。
		 *
		 * <pre>
		 *  db.select('PRODUCT', ['ID']).where({NAME: 'ball'}).execute().progress(function(rs, tx) {
		 * 　db.transaction(tx)
		 * 　　.add(db.update('UPDATE STOCK SET PRICE = 2000').where({ID: rs.item(0).ID}))
		 * 　　.execute();
		 *  });
		 * </pre>
		 *
		 * select().execute()で返ってきたトランザクションを、db.transaction()の引数に指定することで、db.select()とdb.transaction()は同一トランザクションで実行されます。
		 *
		 * @function
		 * @memberOf Transaction
		 * @returns {Promise} Promiseオブジェクト
		 */
		execute: function() {
			var df = this._df;
			var txw = this._txw;
			var queue = this._queue;
			var executed = this._executed;
			var index = 0;
			var tasks = null;

			function createTransactionTask(txObj) {
				function TransactionTask(tx) {
					this._txw = new SQLTransactionWrapper(null, tx);
				}

				var ret = [];

				for ( var i = 0, len = queue.length; i < len; i++) {
					TransactionTask.prototype = queue[i];
					ret.push(new TransactionTask(txObj));
				}

				return ret;
			}

			function executeSql() {
				if (tasks.length === index) {
					var results = [];

					for ( var j = 0, len = tasks.length; j < len; j++) {
						var result = tasks[j]._txw._tasks;
						results.push(result[0].result);
					}

					txw._setResult(results);
					df.notify(results, txw);
					return;
				}

				tasks[index].execute().progress(function(rs, innerTx) {
					index++;
					executeSql();
				});
			}

			try {
				txw._addTask(df);
				checkSqlExecuted(executed);

				if (txw._runTransaction()) {
					tasks = createTransactionTask(txw._tx);
					executeSql();
				} else {
					txw._execute(function(tx) {
						tasks = createTransactionTask(tx);
						txw._tx = tx;
						executeSql();
					}, function(e) {
						transactionErrorCallback(txw, e);
					}, function() {
						transactionSuccessCallback(txw);
					});
				}
			} catch (e) {
				df.reject(e);
			}

			this._df = getDeferred();
			this._executed = true;
			return df.promise();
		},
		promise: function() {
			return this._df.promise();
		}
	});

	/**
	 * Database拡張クラス
	 * <p>
	 * このオブジェクトは自分でnewすることはありません。<br>
	 * <b>h5.api.sqldb.open()</b>を呼び出すと、このクラスのインスタンスが返されます。
	 *
	 * @class
	 * @name DatabaseWrapper
	 * @param {Database} db openDatabase()が返すネイティブのDatabaseオブジェクト
	 */
	function DatabaseWrapper(db) {
		this._db = db;
	}

	$.extend(DatabaseWrapper.prototype, {
		/**
		 * 指定されたテーブルに対して、検索処理(SELECT)を行うためのオブジェクトを生成します。
		 *
		 * @memberOf DatabaseWrapper
		 * @function
		 * @param {String} tableName テーブル名
		 * @param {Array} columns カラム
		 * @param {SQLTransactionWrapper} [txw] トランザクション
		 * @returns {Select} SELECTオブジェクト
		 */
		select: function(tableName, columns, txw) {
			checkTableName('select', tableName);
			checkTransaction('select', txw);

			if (!$.isArray(columns) && columns !== '*') {
				throwFwError(ERR_CODE_INVALID_COLUMN_NAME, 'select');
			}

			return new Select(txw ? txw : new SQLTransactionWrapper(this._db, null), tableName,
					columns);
		},
		/**
		 * 指定されたテーブルに対して、登録処理(INSERT)を行うためのオブジェクトを生成します。
		 * <p>
		 * <b>第二引数valuesの指定方法</b>
		 * <p>
		 * 1テーブルに1件INSERTを行う場合は<b>オブジェクト</b>で値を指定します。また、1テーブルに複数件INSERTを行う場合は<b>配列</b>で値を指定します。<br>
		 * <p>
		 * オブジェクトで指定する場合、シンタックスは以下のようになります。
		 *
		 * <pre>
		 * {カラム名:登録する値, ...}
		 * </pre>
		 *
		 * <p>
		 * 例.USERテーブルに、1件レコードをINSERTする。
		 *
		 * <pre>
		 * db.insert('USER', {
		 * 	ID: 10,
		 * 	NAME: 'TANAKA'
		 * }).execute();
		 * </pre>
		 *
		 * <p>
		 * 配列で指定する場合、シンタックスは以下のようになります。
		 *
		 * <pre>
		 * [{カラム名:登録する値, ...}, {カラム名:登録する値, ...}, ...]
		 * </pre>
		 *
		 * <p>
		 * 例.USERテーブルに、3件レコードをINSERTする。
		 *
		 * <pre>
		 * db.insert('USER', [{
		 * 	ID: 1,
		 * 	NAME: 'TANAKA'
		 * }, {
		 * 	ID: 2,
		 * 	NAME: 'YAMADA'
		 * }, {
		 * 	ID: 3,
		 * 	NAME: 'SUZUKI'
		 * }]).execute();
		 * </pre>
		 *
		 * @memberOf DatabaseWrapper
		 * @function
		 * @param {String} tableName テーブル名
		 * @param {Object|Array} values 値(登録情報を保持するオブジェクトまたは、登録情報のオブジェクトを複数保持する配列)
		 * @param {SQLTransactionWrapper} [txw] トランザクション
		 * @returns {Insert} INSERTオブジェクト
		 */
		insert: function(tableName, values, txw) {
			checkTableName('insert', tableName);
			checkTransaction('insert', txw);

			if (values != null && !$.isArray(values) && !$.isPlainObject(values)) {
				throwFwError(ERR_CODE_INVALID_VALUES, 'insert');
			}

			return new Insert(txw ? txw : new SQLTransactionWrapper(this._db, null), tableName,
					values);
		},
		/**
		 * 指定されたテーブルに対して、更新処理(UPDATE)を行うためのオブジェクトを生成します。
		 * <p>
		 * <b>第二引数valuesの指定方法</b>
		 * <p>
		 * オブジェクトリテラルで以下のように指定します。
		 *
		 * <pre>
		 * {
		 * 	カラム名: 更新後の値
		 * }
		 * </pre>
		 *
		 * <p>
		 * 例.USERテーブルのNAMEカラムを"TANAKA"に更新する。
		 *
		 * <pre>
		 * db.update('USER', {
		 * 	NAME: 'TANAKA'
		 * }).excute();
		 * </pre>
		 *
		 * @memberOf DatabaseWrapper
		 * @function
		 * @param {String} tableName テーブル名
		 * @param {Object} values カラム
		 * @param {SQLTransactionWrapper} [txw] トランザクション
		 * @returns {Update} Updateオブジェクト
		 */
		update: function(tableName, values, txw) {
			checkTableName('update', tableName);
			checkTransaction('update', txw);

			if (!$.isPlainObject(values)) {
				throwFwError(ERR_CODE_INVALID_VALUES, 'update');
			}

			return new Update(txw ? txw : new SQLTransactionWrapper(this._db, null), tableName,
					values);
		},
		/**
		 * 指定されたテーブルに対して、削除処理(DELETE)を行うためのオブジェクトを生成します。
		 * <p>
		 * <i>deleteは予約語なため、delとしています。</i>
		 *
		 * @memberOf DatabaseWrapper
		 * @function
		 * @param {String} tableName テーブル名
		 * @param {SQLTransactionWrapper} [txw] トランザクション
		 * @returns {Del} Delオブジェクト
		 */
		del: function(tableName, txw) {
			checkTableName('del', tableName);
			checkTransaction('del', txw);

			return new Del(txw ? txw : new SQLTransactionWrapper(this._db, null), tableName);
		},
		/**
		 * 指定されたステートメントとパラメータから、SQLを実行するためのオブジェクトを生成します。
		 *
		 * @memberOf DatabaseWrapper
		 * @function
		 * @param {String} statement SQLステートメント
		 * @param {Array} parameters パラメータ
		 * @param {SQLTransactionWrapper} [txw] トランザクション
		 * @returns {Sql} Sqlオブジェクト
		 */
		sql: function(statement, parameters, txw) {
			checkTransaction('sql', txw);

			if (!isString(statement)) {
				throwFwError(ERR_CODE_INVALID_STATEMENT, 'sql');
			}

			if (parameters != null && !$.isArray(parameters)) {
				throwFwError(ERR_CODE_TYPE_NOT_ARRAY, 'sql');
			}

			return new Sql(txw ? txw : new SQLTransactionWrapper(this._db, null), statement,
					parameters);
		},
		/**
		 * 指定された複数のSQLを同一トランザクションで実行するためのオブジェクトを生成します。
		 *
		 * @memberOf DatabaseWrapper
		 * @function
		 * @param {String} statement テーブル名
		 * @param {Array} parameters パラメータ
		 * @returns {Transaction} Transactionオブジェクト
		 */
		transaction: function(txw) {
			checkTransaction('sql', txw);
			return new Transaction(txw ? txw : new SQLTransactionWrapper(this._db, null));
		}
	});

	function WebSqlDatabase() {
	// 空コンストラクタ
	}

	/**
	 * Web SQL Database
	 *
	 * @memberOf h5.api
	 * @name sqldb
	 * @namespace
	 */
	$.extend(WebSqlDatabase.prototype, {
		/**
		 * Web SQL Databaseが使用可能であるかの判定結果
		 *
		 * @memberOf h5.api.sqldb
		 * @name isSupported
		 * @type Boolean
		 */
		isSupported: !!window.openDatabase,
		/**
		 * データベースに接続します。
		 *
		 * @memberOf h5.api.sqldb
		 * @name open
		 * @function
		 * @param {String} name データベース名
		 * @param {String} [version] バージョン
		 * @param {String} [displayName] 表示用データベース名
		 * @param {Number} [estimatedSize] 見込み容量(バイト)
		 * @returns {DatabaseWrapper} Databaseオブジェクト
		 */
		open: function(name, version, displayName, estimatedSize) {
			if (!this.isSupported) {
				return;
			}

			var conn = openDatabase(name, version, displayName, estimatedSize);
			return new DatabaseWrapper(conn);
		}
	});

	// =============================
	// Expose to window
	// =============================

	h5.u.obj.expose('h5.api', {
		sqldb: new WebSqlDatabase()
	});
})();


/* ------ h5.api.storage ------ */
(function() {
	// =========================================================================
	//
	// Constants
	//
	// =========================================================================

	// =============================
	// Production
	// =============================

	// =============================
	// Development Only
	// =============================

	var fwLogger = h5.log.createLogger('h5.api.storage');
	/* del begin */
	var FW_LOG_STORAGE_SUPPORTED = 'local storage supported:{0}, session storage supported:{1}';
	/* del end */

	// =========================================================================
	//
	// Cache
	//
	// =========================================================================
	// =========================================================================
	//
	// Privates
	//
	// =========================================================================
	// =============================
	// Variables
	// =============================
	// =============================
	// Functions
	// =============================
	// =========================================================================
	//
	// Body
	//
	// =========================================================================
	function WebStorage(storage) {
		/**
		 * ストレージオブジェクト(localStorage/sessionStorage)
		 *
		 * @member h5.api.storage.local
		 * @name storage
		 * @type Storage
		 * @private
		 */
		this._storage = storage;
	}

	/**
	 * Web Storage
	 *
	 * @memberOf h5.api
	 * @name storage
	 * @namespace
	 */
	$.extend(WebStorage.prototype, {
		/**
		 * ストレージに保存されている、キーと値のペアの数を取得します。
		 *
		 * @memberOf h5.api.storage.local
		 * @name getLength
		 * @function
		 * @returns {Number} キーとペアの数
		 */
		getLength: function() {
			return this._storage.length;
		},

		/**
		 * 指定されたインデックスにあるキーを、ストレージから取得します。
		 *
		 * @memberOf h5.api.storage.local
		 * @name key
		 * @function
		 * @param {Number} index インデックス
		 * @returns {String} キー
		 */
		key: function(index) {
			return this._storage.key(index);
		},

		/**
		 * 指定されたキーに紐付く値を、ストレージから取得します。
		 * <p>
		 * 自動的にsetItem()実行時に保存したときの型に戻します。
		 *
		 * @memberOf h5.api.storage.local
		 * @name getItem
		 * @function
		 * @param {String} key キー
		 * @returns {Any} キーに紐付く値
		 */
		getItem: function(key) {
			var str = this._storage.getItem(key);
			if (str === null) {
				return null;
			}
			return h5.u.obj.deserialize(str);
		},

		/**
		 * 指定されたキーで、値をストレージに保存します。
		 * <p>
		 * 値は、シリアライズして保存します。保存できる型は<a href="./h5.u.obj.html#serialize">h5.u.obj.serialize()</a>を参照してください。
		 * </p>
		 *
		 * @memberOf h5.api.storage.local
		 * @name setItem
		 * @function
		 * @param {String} key キー
		 * @param {Any} value 値
		 */
		setItem: function(key, value) {
			this._storage.setItem(key, h5.u.obj.serialize(value));
		},

		/**
		 * 指定されたキーに紐付く値を、ストレージから削除します。
		 *
		 * @memberOf h5.api.storage.local
		 * @name removeItem
		 * @function
		 * @param {String} key キー
		 */
		removeItem: function(key) {
			this._storage.removeItem(key);
		},

		/**
		 * ストレージに保存されている全てのキーとそれに紐付く値を全て削除します。
		 *
		 * @memberOf h5.api.storage.local
		 * @name clear
		 * @function
		 */
		clear: function() {
			this._storage.clear();
		},

		/**
		 * 現在ストレージに保存されているオブジェクト数分、キーと値をペアで取得します。
		 *
		 * @memberOf h5.api.storage.local
		 * @name each
		 * @function
		 * @param {Function} callback インデックス, キー, 値 を引数に持つコールバック関数
		 */
		each: function(callback) {
			var storage = this._storage;

			for ( var i = 0, len = storage.length; i < len; i++) {
				var k = storage.key(i);
				callback(i, k, this.getItem(k));
			}
		}
	});

	// =============================
	// Expose to window
	// =============================

	h5.u.obj.expose('h5.api.storage', {
		/**
		 * ブラウザがこのAPIをサポートしているか。
		 *
		 * @memberOf h5.api.storage
		 * @name isSupported
		 * @type Boolean
		 */
		// APIはlocalStorageとsessionStorageに分かれており、本来であればそれぞれサポート判定する必要があるが、
		// 仕様ではStorage APIとして一つに扱われておりかつ、テストした限りでは片方のみ使用できるブラウザが見つからない為、一括りに判定している。
		isSupported: !!window.localStorage,
		/**
		 * ローカルストレージ
		 *
		 * @memberOf h5.api.storage
		 * @name local
		 * @namespace
		 */
		local: new WebStorage(window.localStorage),
		/**
		 * セッションストレージ
		 *
		 * @memberOf h5.api.storage
		 * @name session
		 * @namespace
		 */
		session: new WebStorage(window.sessionStorage)
	});

	/* del begin */
	fwLogger.debug(FW_LOG_STORAGE_SUPPORTED, !!window.localStorage, !!window.sessionStorage);
	/* del end */
})();

/* del begin */
/* ------ h5.dev.api.geo ------ */
(function() {
	// =========================================================================
	//
	// Constants
	//
	// =========================================================================

	// =============================
	// Production
	// =============================

	// =============================
	// Development Only
	// =============================


	// =========================================================================
	//
	// Cache
	//
	// =========================================================================
	// =========================================================================
	//
	// Privates
	//
	// =========================================================================

	// =============================
	// Variables
	// =============================

	/**
	 * 元のh5.api.geo
	 *
	 * @private
	 */
	var originalAPI = {};

	/**
	 * _watchPositionで作られたdeferredオブジェクトの配列
	 *
	 * @private
	 * @type deferred[]
	 */
	var _dfds = [];
	/**
	 * _watchPositionで作られたdeferredオブジェクトに割り当てるID
	 *
	 * @private
	 * @type Number
	 */
	var _dfdID = 0;
	/**
	 * _watchPositionで使用するsetInterval()のタイマーID
	 *
	 * @private
	 * @type Number
	 */
	var _timerID = null;
	/**
	 * _watchPositionがデバッグ用位置情報の何番目を見ているかを設定します。
	 *
	 * @private
	 * @type Number
	 */
	var _watchPointer = 0;

	// =============================
	// Functions
	// =============================
	/**
	 * 以下の構造の位置情報オブジェクトを生成します<br>
	 * <p>
	 * <table border="1">
	 * <tr>
	 * <td>プロパティ名</td>
	 * <td>説明</td>
	 * </tr>
	 * <tr>
	 * <td>latitude</td>
	 * <td>緯度</td>
	 * </tr>
	 * <tr>
	 * <td>longitude</td>
	 * <td>経度</td>
	 * </tr>
	 * <tr>
	 * <td>accuracy</td>
	 * <td>位置の誤差(m)</td>
	 * </tr>
	 * <tr>
	 * <td>altitude</td>
	 * <td>高度(m)</td>
	 * </tr>
	 * <tr>
	 * <td>altitudeAccuracy</td>
	 * <td>高度の誤差(m)</td>
	 * </tr>
	 * <tr>
	 * <td>heading</td>
	 * <td>方角(0～360)(度)</td>
	 * </tr>
	 * <tr>
	 * <td>speed</td>
	 * <td>速度 (m/s)</td>
	 * </tr>
	 * <tr>
	 * <td>timestamp</td>
	 * <td>時刻</td>
	 * </tr>
	 * </table>
	 *
	 * @memberOf h5.dev.api.geo
	 * @private
	 * @params {Object} dummyPosition dummyPositionsに格納されたオブジェクト
	 * @returns {Object} 位置情報オブジェクト
	 * @type Object[]
	 */
	function createPosition(params) {
		var param = params || {};
		param.timestamp = param.timestamp || new Date().getTime();
		var coords = param.coords ? param.coords : param;
		param.coords = {
			latitude: coords.latitude || 0,
			longitude: coords.longitude || 0,
			accuracy: coords.accuracy || 0,
			altitude: coords.altitude || null,
			altitudeAccuracy: coords.altitudeAccuracy || null,
			heading: coords.heading || null,
			speed: coords.speed || null
		};
		return param;
	}

	// =========================================================================
	//
	// Body
	//
	// =========================================================================

	// originalAPI に 元のgetCurrentPositionとwatchPositionをとっておく
	originalAPI.getCurrentPosition = h5.api.geo.getCurrentPosition;
	originalAPI.watchPosition = h5.api.geo.watchPosition;

	/**
	 * ※この関数はh5.dev.jsを読み込んだ場合のみ利用可能です。開発支援用機能のため、最終リリース物にh5.dev.jsやデバッグコードが混入しないよう十分ご注意ください。<br>
	 * dummyPosiitonsへ位置情報オブジェクトを格納して使用してください。位置情報はcreatePosition()で作成することができます。
	 *
	 * @memberOf h5.dev.api
	 * @name geo
	 * @namespace
	 */
	var h5GeolocationSupport = {
		/**
		 * 強制的にロケーションの取得に失敗させるかどうか
		 *
		 * @memberOf h5.dev.api.geo
		 * @type Boolean
		 */
		forceError: false,
		/**
		 * _watchPositionの座標の送信間隔(ms)
		 *
		 * @memberOf h5.dev.api.geo
		 * @type Number
		 */
		watchIntervalTime: 1000,
		/**
		 * デバッグ用位置情報
		 * <p>
		 * 位置情報オブジェクトを格納する配列です。 以下のようなオブジェクトを格納してください。
		 * </p>
		 * <table class="params" style=""><thead>
		 * <tr>
		 * <th>Name</th>
		 * <th>Type</th>
		 * <th>Argument</th>
		 * <th class="last">Description</th>
		 * </tr>
		 * </thead><tbody>
		 * <tr>
		 * <td class="name"><code>coords</code></td>
		 * <td class="type"> Object </td>
		 * <td class="attributes"></td>
		 * <td class="description last">
		 * <h6>Properties</h6>
		 * <table class="params"><thead>
		 * <tr>
		 * <th>Name</th>
		 * <th>Type</th>
		 * <th>Argument</th>
		 * <th>Default</th>
		 * <th class="last">Description</th>
		 * </tr>
		 * </thead><tbody>
		 * <tr>
		 * <td class="name"><code>latitude</code></td>
		 * <td class="type"> Number </td>
		 * <td class="attributes"> &lt;optional&gt;<br>
		 * </td>
		 * <td class="default"> 0 </td>
		 * <td class="description last">緯度</td>
		 * </tr>
		 * <tr>
		 * <td class="name"><code>longitude</code></td>
		 * <td class="type"> Number </td>
		 * <td class="attributes"> &lt;optional&gt;<br>
		 * </td>
		 * <td class="default"> 0 </td>
		 * <td class="description last">経度</td>
		 * </tr>
		 * <tr>
		 * <td class="name"><code>accuracy</code></td>
		 * <td class="type"> Number </td>
		 * <td class="attributes"> &lt;optional&gt;<br>
		 * </td>
		 * <td class="default"> 50 </td>
		 * <td class="description last">位置の誤差(m)</td>
		 * </tr>
		 * <tr>
		 * <td class="name"><code>altitude</code></td>
		 * <td class="type"> Number </td>
		 * <td class="attributes"> &lt;optional&gt;<br>
		 * </td>
		 * <td class="default"> null </td>
		 * <td class="description last">高度(m)</td>
		 * </tr>
		 * <tr>
		 * <td class="name"><code>altitudeAccuracy</code></td>
		 * <td class="type"> Number </td>
		 * <td class="attributes"> &lt;optional&gt;<br>
		 * </td>
		 * <td class="default"> null </td>
		 * <td class="description last">高度の誤差(m)</td>
		 * </tr>
		 * <tr>
		 * <td class="name"><code>heading</code></td>
		 * <td class="type"> Number </td>
		 * <td class="attributes"> &lt;optional&gt;<br>
		 * </td>
		 * <td class="default"> null </td>
		 * <td class="description last">方角(0～360)(度)</td>
		 * </tr>
		 * <tr>
		 * <td class="name"><code>speed</code></td>
		 * <td class="type"> Number </td>
		 * <td class="attributes"> &lt;optional&gt;<br>
		 * </td>
		 * <td class="default"> null </td>
		 * <td class="description last">速度 (m/s)</td>
		 * </tr>
		 * </tbody></table></td>
		 * </tr>
		 * <tr>
		 * <td class="name"><code>timestamp</code></td>
		 * <td class="type"> Number </td>
		 * <td class="attributes"> &lt;optional&gt;<br>
		 * </td>
		 * <td class="description last">タイムスタンプ。省略時は取得時のタイムスタンプが自動で格納されます。</td>
		 * </tr>
		 * </tbody></table> <br>
		 * <br>
		 *
		 * <pre>
		 * 	例１．
		 * 	h5.api.geo.dummyPositions.push({
		 * 		coords:{
		 * 			latitude: 35.45019435393257,
		 * 			longitude: 139.6305128879394,
		 * 			accuracy: 50,
		 * 			altitude: 100,
		 * 			altitudeAccuracy: 100,
		 * 			heading: 90,
		 * 			speed: 9
		 * 		}
		 * 	timestamp: 1331106454545
		 * 	})
		 * </pre>
		 *
		 * <p>
		 * 省略したプロパティにはdefault値が入ります。timestampを省略すると、取得時に値が格納されます。
		 * </p>
		 *
		 * <pre>
		 * 	例２．
		 * 	h5.api.geo.dummyPositions.push({
		 * 		coords: {
		 * 			latitude: 35.45019435393257,
		 * 			longitude: 139.6305128879394,
		 * 		}
		 * 	})
		 * </pre>
		 *
		 * <p>
		 * coordsの中身だけを記述して格納することもできます。getPositionや_watchPositionでの取得時にcoordsプロパティに格納して返します。省略したプロパティにはdefault値が入ります。
		 * timestampには取得時に値が格納されます。
		 * </p>
		 *
		 * <pre>
		 * 	例３．
		 * 	h5.api.geo.dummyPositions.push(
		 * 		latitude: 35.45019435393257,
		 * 		longitude: 139.6305128879394
		 * 	})
		 * </pre>
		 *
		 * <p>
		 * <a href="http://www.htmlhifive.com/ja/recipe/geolocation/index.html">座標データ生成ツール</a>を使うと地図から緯度と経度を求められます。
		 * </p>
		 *
		 * @memberOf h5.dev.api.geo
		 * @type Object[]
		 */
		dummyPositions: []
	};

	/**
	 * dummyPositionsの先頭の位置情報を返します。dummyPositionsがオブジェクトの場合はdummyPositionsを返します。
	 * <p>
	 * このメソッドはh5.api.geo.getCurrentPosition()で呼びます。※ h5.dev.api.geo.getCurrentPosition()ではありません。
	 * </p>
	 * <p>
	 * dummyPositionsに値が設定されていない場合は元のh5.api.geoのメソッドを実行します。
	 * </p>
	 *
	 * @memberOf h5.dev.api.geo
	 * @function
	 * @param {Object} [option] 設定情報
	 * @param {Boolean} [option.enableHighAccuracy] 正確な位置を取得するか (ただし消費電力の増加や応答が遅延する)
	 * @param {Number} [option.timeout] 位置情報を取得するまで待機する時間 (ミリ秒)
	 * @param {Number} [option.maximumAge] キャッシュされた位置情報の有効期間を指定する (ミリ秒)
	 * @returns {Promise} Promiseオブジェクト
	 */
	function getCurrentPosition(option) {
		var dfd = h5.async.deferred();
		if (h5.dev.api.geo.forceError) {
			setTimeout(function() {
				dfd.reject({
					code: 'forceError'
				});
			}, 0);
			return dfd.promise();
		}

		var positions = h5.dev.api.geo.dummyPositions;
		if (!positions || positions.length === 0) {
			return originalAPI.getCurrentPosition(option);
		}
		// dummyPositionsが配列でない場合も対応する
		var positionsAry = wrapInArray(positions);

		setTimeout(function() {
			dfd.resolve(createPosition(positionsAry[0]));
		}, 0);
		return dfd.promise();
	}

	/**
	 * dummyPositionsの緯度・緯度を順番に返します。 dummyPositionsの末尾まで到達すると、末尾の要素を返し続けます。
	 * <p>
	 * このメソッドはh5.api.geo.watchPosition()で呼びます。※ h5.dev.api.geo.watchtPosition()ではありません。
	 * </p>
	 * <p>
	 * dummyPositionsに値が設定されていない場合は元のh5.api.geoのメソッドを実行します。
	 * </p>
	 *
	 * @memberOf h5.dev.api.geo
	 * @function
	 * @name watchPosition
	 * @param {Object} [option] 設定情報
	 * @param {Boolean} [option.enableHighAccuracy] 正確な位置を取得するか (ただし消費電力の増加や応答が遅延する)
	 * @param {Number} [option.timeout] 位置情報を取得するまで待機する時間 (ミリ秒)
	 * @param {Number} [option.maximumAge] キャッシュされた位置情報の有効期間を指定する (ミリ秒)
	 * @returns {WatchPositionPromise} WatchPositionPromiseオブジェクト
	 */
	function watchPosition(option) {
		var dfd = h5.async.deferred();
		if (h5.dev.api.geo.forceError) {
			setTimeout(function() {
				dfd.reject({
					code: 'forceError'
				});
			}, 0);
			return dfd.promise();
		}
		// dummyPositionsが配列でない場合も対応する
		var dummyPos = wrapInArray(h5.dev.api.geo.dummyPositions);
		if (dummyPos.length === 0) {
			return originalAPI.watchPosition(option);
		}

		var watchID = _dfdID++;
		// WatchPositionPromiseクラス
		// _watchPositionはこのクラスをプロミス化して返す。
		var WatchPositionPromise = function() {
		// コンストラクタ
		};
		// promiseオブジェクトにunwatchメソッドを付加
		WatchPositionPromise.prototype = {
			// unwatchを呼び出したdeferredを_dfds[]から削除
			unwatch: function() {
				_dfds[watchID] && _dfds[watchID].resolve();
				delete _dfds[watchID];
				setTimeout(function() {
					// deferredオブジェクトがすべてなくなったらタイマーの停止
					// dummyPositionsの見ている位置を0に戻す。
					if ($.isEmptyObject(_dfds)) {
						clearInterval(_timerID);
						_timerID = null;
						_watchPointer = 0;
					}
				}, 0);
			}
		};

		setTimeout(function() {
			_dfds[watchID] = dfd;
			if (_timerID === null) {
				var intervalFunc = function() {
					var pos;
					if (_watchPointer >= dummyPos.length) {
						pos = dummyPos[dummyPos.length - 1];
					} else {
						pos = dummyPos[_watchPointer++];
					}
					for ( var id in _dfds) {
						_dfds[id].notify(createPosition(pos));
					}
				};
				intervalFunc();
				_timerID = setInterval(intervalFunc, h5.dev.api.geo.watchIntervalTime);
			}
		}, 0);
		return dfd.promise(new WatchPositionPromise(watchID));
	}

	// =============================
	// Expose to window
	// =============================

	// getCurrentPosition と watchPosition を上書きする。
	$.extend(h5.api.geo, {
		getCurrentPosition: getCurrentPosition,
		watchPosition: watchPosition
	});
	h5.u.obj.expose('h5.dev.api.geo', h5GeolocationSupport);
})();
/* del end */

	/* del begin */
	var fwLogger = h5.log.createLogger('h5');
	fwLogger.info('開発版のhifive(ver.{0})の読み込みが完了しました。リリース時はMinify版（h5.js）を使用してください。', h5.env.version);
	fwLogger.info('hifive内部で使用されるjQueryのバージョン：{0}', $.fn.jquery);
	/* del end */

})(jQuery);
