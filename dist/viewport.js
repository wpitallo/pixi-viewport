'use strict';

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

var _get = function get(object, property, receiver) { if (object === null) object = Function.prototype; var desc = Object.getOwnPropertyDescriptor(object, property); if (desc === undefined) { var parent = Object.getPrototypeOf(object); if (parent === null) { return undefined; } else { return get(parent, property, receiver); } } else if ("value" in desc) { return desc.value; } else { var getter = desc.get; if (getter === undefined) { return undefined; } return getter.call(receiver); } };

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _possibleConstructorReturn(self, call) { if (!self) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return call && (typeof call === "object" || typeof call === "function") ? call : self; }

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; }

var PIXI = require('pixi.js');

var utils = require('./utils');
var Drag = require('./drag');
var Pinch = require('./pinch');
var Clamp = require('./clamp');
var ClampZoom = require('./clamp-zoom');
var Decelerate = require('./decelerate');
var Bounce = require('./bounce');
var Snap = require('./snap');
var SnapZoom = require('./snap-zoom');
var Follow = require('./follow');
var Wheel = require('./wheel');
var MouseEdges = require('./mouse-edges');

var PLUGIN_ORDER = ['drag', 'pinch', 'wheel', 'follow', 'mouse-edges', 'decelerate', 'bounce', 'snap-zoom', 'clamp-zoom', 'snap', 'clamp'];

var Viewport = function (_PIXI$Container) {
    _inherits(Viewport, _PIXI$Container);

    /**
     * @extends PIXI.Container
     * @extends EventEmitter
     * @param {object} [options]
     * @param {number} [options.screenWidth=window.innerWidth]
     * @param {number} [options.screenHeight=window.innerHeight]
     * @param {number} [options.worldWidth=this.width]
     * @param {number} [options.worldHeight=this.height]
     * @param {number} [options.threshold=5] number of pixels to move to trigger an input event (e.g., drag, pinch) or disable a clicked event
     * @param {boolean} [options.passiveWheel=true] whether the 'wheel' event is set to passive
     * @param {boolean} [options.stopPropagation=false] whether to stopPropagation of events that impact the viewport
     * @param {(PIXI.Rectangle|PIXI.Circle|PIXI.Ellipse|PIXI.Polygon|PIXI.RoundedRectangle)} [options.forceHitArea] change the default hitArea from world size to a new value
     * @param {boolean} [options.noTicker] set this if you want to manually call update() function on each frame
     * @param {PIXI.ticker.Ticker} [options.ticker=PIXI.Ticker.shared||PIXI.ticker.shared] use this PIXI.ticker for updates
     * @param {PIXI.InteractionManager} [options.interaction=null] InteractionManager, available from instantiated WebGLRenderer/CanvasRenderer.plugins.interaction - used to calculate pointer postion relative to canvas location on screen
     * @param {HTMLElement} [options.divWheel=document.body] div to attach the wheel event
     * @fires clicked
     * @fires drag-start
     * @fires drag-end
     * @fires drag-remove
     * @fires pinch-start
     * @fires pinch-end
     * @fires pinch-remove
     * @fires snap-start
     * @fires snap-end
     * @fires snap-remove
     * @fires snap-zoom-start
     * @fires snap-zoom-end
     * @fires snap-zoom-remove
     * @fires bounce-x-start
     * @fires bounce-x-end
     * @fires bounce-y-start
     * @fires bounce-y-end
     * @fires bounce-remove
     * @fires wheel
     * @fires wheel-remove
     * @fires wheel-scroll
     * @fires wheel-scroll-remove
     * @fires mouse-edge-start
     * @fires mouse-edge-end
     * @fires mouse-edge-remove
     * @fires moved
     * @fires moved-end
     * @fires zoomed
     * @fires zoomed-end
     */
    function Viewport(options) {
        _classCallCheck(this, Viewport);

        options = options || {};

        var _this = _possibleConstructorReturn(this, (Viewport.__proto__ || Object.getPrototypeOf(Viewport)).call(this));

        _this.plugins = {};
        _this.pluginsList = [];
        _this._screenWidth = options.screenWidth || window.innerWidth;
        _this._screenHeight = options.screenHeight || window.innerHeight;
        _this._worldWidth = options.worldWidth;
        _this._worldHeight = options.worldHeight;
        _this.hitAreaFullScreen = utils.defaults(options.hitAreaFullScreen, true);
        _this.forceHitArea = options.forceHitArea;
        _this.passiveWheel = utils.defaults(options.passiveWheel, true);
        _this.stopEvent = options.stopPropagation;
        _this.threshold = utils.defaults(options.threshold, 5);
        _this.interaction = options.interaction || null;
        _this.div = options.divWheel || document.body;
        _this.listeners(_this.div);
        _this.div.oncontextmenu = function (e) {
            return e.preventDefault();
        };

        /**
         * active touch point ids on the viewport
         * @type {number[]}
         * @readonly
         */
        _this.touches = [];

        if (!options.noTicker) {
            _this.ticker = options.ticker || (PIXI.Ticker ? PIXI.Ticker.shared : PIXI.ticker.shared);
            _this.tickerFunction = function () {
                return _this.update(_this.ticker.elapsedMS);
            };
            _this.ticker.add(_this.tickerFunction);
        }
        return _this;
    }

    /**
     * removes all event listeners from viewport
     * (useful for cleanup of wheel and ticker events when removing viewport)
     */


    _createClass(Viewport, [{
        key: 'removeListeners',
        value: function removeListeners() {
            this.ticker.remove(this.tickerFunction);
            this.div.removeEventListener('wheel', this.wheelFunction);
        }

        /**
         * overrides PIXI.Container's destroy to also remove the 'wheel' and PIXI.Ticker listeners
         */

    }, {
        key: 'destroy',
        value: function destroy(options) {
            _get(Viewport.prototype.__proto__ || Object.getPrototypeOf(Viewport.prototype), 'destroy', this).call(this, options);
            this.removeListeners();
        }

        /**
         * update viewport on each frame
         * by default, you do not need to call this unless you set options.noTicker=true
         */

    }, {
        key: 'update',
        value: function update(elapsed) {
            if (!this.pause) {
                var _iteratorNormalCompletion = true;
                var _didIteratorError = false;
                var _iteratorError = undefined;

                try {
                    for (var _iterator = this.pluginsList[Symbol.iterator](), _step; !(_iteratorNormalCompletion = (_step = _iterator.next()).done); _iteratorNormalCompletion = true) {
                        var plugin = _step.value;

                        plugin.update(elapsed);
                    }
                } catch (err) {
                    _didIteratorError = true;
                    _iteratorError = err;
                } finally {
                    try {
                        if (!_iteratorNormalCompletion && _iterator.return) {
                            _iterator.return();
                        }
                    } finally {
                        if (_didIteratorError) {
                            throw _iteratorError;
                        }
                    }
                }

                if (this.lastViewport) {
                    // check for moved-end event
                    if (this.lastViewport.x !== this.x || this.lastViewport.y !== this.y) {
                        this.moving = true;
                    } else {
                        if (this.moving) {
                            this.emit('moved-end', this);
                            this.moving = false;
                        }
                    }
                    // check for zoomed-end event
                    if (this.lastViewport.scaleX !== this.scale.x || this.lastViewport.scaleY !== this.scale.y) {
                        this.zooming = true;
                    } else {
                        if (this.zooming) {
                            this.emit('zoomed-end', this);
                            this.zooming = false;
                        }
                    }
                }

                if (!this.forceHitArea) {
                    this.hitArea.x = this.left;
                    this.hitArea.y = this.top;
                    this.hitArea.width = this.worldScreenWidth;
                    this.hitArea.height = this.worldScreenHeight;
                }
                this._dirty = this._dirty || !this.lastViewport || this.lastViewport.x !== this.x || this.lastViewport.y !== this.y || this.lastViewport.scaleX !== this.scale.x || this.lastViewport.scaleY !== this.scale.y;
                this.lastViewport = {
                    x: this.x,
                    y: this.y,
                    scaleX: this.scale.x,
                    scaleY: this.scale.y
                };
            }
        }

        /**
         * use this to set screen and world sizes--needed for pinch/wheel/clamp/bounce
         * @param {number} [screenWidth=window.innerWidth]
         * @param {number} [screenHeight=window.innerHeight]
         * @param {number} [worldWidth]
         * @param {number} [worldHeight]
         */

    }, {
        key: 'resize',
        value: function resize(screenWidth, screenHeight, worldWidth, worldHeight) {
            this._screenWidth = screenWidth || window.innerWidth;
            this._screenHeight = screenHeight || window.innerHeight;
            if (worldWidth) {
                this._worldWidth = worldWidth;
            }
            if (worldHeight) {
                this._worldHeight = worldHeight;
            }
            this.resizePlugins();
        }

        /**
         * called after a worldWidth/Height change
         * @private
         */

    }, {
        key: 'resizePlugins',
        value: function resizePlugins() {
            var _iteratorNormalCompletion2 = true;
            var _didIteratorError2 = false;
            var _iteratorError2 = undefined;

            try {
                for (var _iterator2 = this.pluginsList[Symbol.iterator](), _step2; !(_iteratorNormalCompletion2 = (_step2 = _iterator2.next()).done); _iteratorNormalCompletion2 = true) {
                    var plugin = _step2.value;

                    plugin.resize();
                }
            } catch (err) {
                _didIteratorError2 = true;
                _iteratorError2 = err;
            } finally {
                try {
                    if (!_iteratorNormalCompletion2 && _iterator2.return) {
                        _iterator2.return();
                    }
                } finally {
                    if (_didIteratorError2) {
                        throw _iteratorError2;
                    }
                }
            }
        }

        /**
         * screen width in screen pixels
         * @type {number}
         */

    }, {
        key: 'getVisibleBounds',


        /**
         * get visible bounds of viewport
         * @return {object} bounds { x, y, width, height }
         */
        value: function getVisibleBounds() {
            return { x: this.left, y: this.top, width: this.worldScreenWidth, height: this.worldScreenHeight };
        }

        /**
         * add input listeners
         * @private
         */

    }, {
        key: 'listeners',
        value: function listeners(div) {
            var _this2 = this;

            this.interactive = true;
            if (!this.forceHitArea) {
                this.hitArea = new PIXI.Rectangle(0, 0, this.worldWidth, this.worldHeight);
            }
            this.on('pointerdown', this.down);
            this.on('pointermove', this.move);
            this.on('pointerup', this.up);
            this.on('pointerupoutside', this.up);
            this.on('pointercancel', this.up);
            this.on('pointerout', this.up);
            this.wheelFunction = function (e) {
                return _this2.handleWheel(e);
            };
            div.addEventListener('wheel', this.wheelFunction, { passive: this.passiveWheel });
            this.isMouseDown = false;
        }

        /**
         * handle down events
         * @private
         */

    }, {
        key: 'down',
        value: function down(e) {
            if (this.pause || !this.worldVisible) {
                return;
            }
            if (e.data.pointerType === 'mouse') {
                this.isMouseDown = true;
            } else {
                this.touches.push(e.data.pointerId);
            }

            if (this.countDownPointers() === 1) {
                this.last = e.data.global.clone();

                // clicked event does not fire if viewport is decelerating or bouncing
                var decelerate = this.plugins['decelerate'];
                var bounce = this.plugins['bounce'];
                if ((!decelerate || !decelerate.isActive()) && (!bounce || !bounce.isActive())) {
                    this.clickedAvailable = true;
                } else {
                    this.clickedAvailable = false;
                }
            } else {
                this.clickedAvailable = false;
            }

            var stop = void 0;
            var _iteratorNormalCompletion3 = true;
            var _didIteratorError3 = false;
            var _iteratorError3 = undefined;

            try {
                for (var _iterator3 = this.pluginsList[Symbol.iterator](), _step3; !(_iteratorNormalCompletion3 = (_step3 = _iterator3.next()).done); _iteratorNormalCompletion3 = true) {
                    var plugin = _step3.value;

                    if (plugin.down(e)) {
                        stop = true;
                    }
                }
            } catch (err) {
                _didIteratorError3 = true;
                _iteratorError3 = err;
            } finally {
                try {
                    if (!_iteratorNormalCompletion3 && _iterator3.return) {
                        _iterator3.return();
                    }
                } finally {
                    if (_didIteratorError3) {
                        throw _iteratorError3;
                    }
                }
            }

            if (stop && this.stopEvent) {
                e.stopPropagation();
            }
        }

        /**
         * whether change exceeds threshold
         * @private
         * @param {number} change
         */

    }, {
        key: 'checkThreshold',
        value: function checkThreshold(change) {
            if (Math.abs(change) >= this.threshold) {
                return true;
            }
            return false;
        }

        /**
         * handle move events
         * @private
         */

    }, {
        key: 'move',
        value: function move(e) {
            if (this.pause || !this.worldVisible) {
                return;
            }

            var stop = void 0;
            var _iteratorNormalCompletion4 = true;
            var _didIteratorError4 = false;
            var _iteratorError4 = undefined;

            try {
                for (var _iterator4 = this.pluginsList[Symbol.iterator](), _step4; !(_iteratorNormalCompletion4 = (_step4 = _iterator4.next()).done); _iteratorNormalCompletion4 = true) {
                    var plugin = _step4.value;

                    if (plugin.move(e)) {
                        stop = true;
                    }
                }
            } catch (err) {
                _didIteratorError4 = true;
                _iteratorError4 = err;
            } finally {
                try {
                    if (!_iteratorNormalCompletion4 && _iterator4.return) {
                        _iterator4.return();
                    }
                } finally {
                    if (_didIteratorError4) {
                        throw _iteratorError4;
                    }
                }
            }

            if (this.clickedAvailable) {
                var distX = e.data.global.x - this.last.x;
                var distY = e.data.global.y - this.last.y;
                if (this.checkThreshold(distX) || this.checkThreshold(distY)) {
                    this.clickedAvailable = false;
                }
            }

            if (stop && this.stopEvent) {
                e.stopPropagation();
            }
        }

        /**
         * handle up events
         * @private
         */

    }, {
        key: 'up',
        value: function up(e) {
            if (this.pause || !this.worldVisible) {
                return;
            }
            if (e.data.pointerType === 'mouse') {
                this.isMouseDown = false;
            }
            if (e.data.pointerType !== 'mouse') {
                for (var i = 0; i < this.touches.length; i++) {
                    if (this.touches[i] === e.data.pointerId) {
                        this.touches.splice(i, 1);
                        break;
                    }
                }
            }

            var stop = void 0;
            var _iteratorNormalCompletion5 = true;
            var _didIteratorError5 = false;
            var _iteratorError5 = undefined;

            try {
                for (var _iterator5 = this.pluginsList[Symbol.iterator](), _step5; !(_iteratorNormalCompletion5 = (_step5 = _iterator5.next()).done); _iteratorNormalCompletion5 = true) {
                    var plugin = _step5.value;

                    if (plugin.up(e)) {
                        stop = true;
                    }
                }
            } catch (err) {
                _didIteratorError5 = true;
                _iteratorError5 = err;
            } finally {
                try {
                    if (!_iteratorNormalCompletion5 && _iterator5.return) {
                        _iterator5.return();
                    }
                } finally {
                    if (_didIteratorError5) {
                        throw _iteratorError5;
                    }
                }
            }

            if (this.clickedAvailable && this.countDownPointers() === 0) {
                this.emit('clicked', { screen: this.last, world: this.toWorld(this.last), viewport: this });
                this.clickedAvailable = false;
            }

            if (stop && this.stopEvent) {
                e.stopPropagation();
            }
        }

        /**
         * gets pointer position if this.interaction is set
         * @param {UIEvent} evt
         * @private
         */

    }, {
        key: 'getPointerPosition',
        value: function getPointerPosition(evt) {
            var point = new PIXI.Point();
            if (this.interaction) {
                this.interaction.mapPositionToPoint(point, evt.clientX, evt.clientY);
            } else {
                point.x = evt.clientX;
                point.y = evt.clientY;
            }
            return point;
        }

        /**
         * handle wheel events
         * @private
         */

    }, {
        key: 'handleWheel',
        value: function handleWheel(e) {
            if (this.pause || !this.worldVisible) {
                return;
            }

            // only handle wheel events where the mouse is over the viewport
            var point = this.toLocal(this.getPointerPosition(e));
            if (this.left <= point.x && point.x <= this.right && this.top <= point.y && point.y <= this.bottom) {
                var result = void 0;
                var _iteratorNormalCompletion6 = true;
                var _didIteratorError6 = false;
                var _iteratorError6 = undefined;

                try {
                    for (var _iterator6 = this.pluginsList[Symbol.iterator](), _step6; !(_iteratorNormalCompletion6 = (_step6 = _iterator6.next()).done); _iteratorNormalCompletion6 = true) {
                        var plugin = _step6.value;

                        if (plugin.wheel(e)) {
                            result = true;
                        }
                    }
                } catch (err) {
                    _didIteratorError6 = true;
                    _iteratorError6 = err;
                } finally {
                    try {
                        if (!_iteratorNormalCompletion6 && _iterator6.return) {
                            _iterator6.return();
                        }
                    } finally {
                        if (_didIteratorError6) {
                            throw _iteratorError6;
                        }
                    }
                }

                return result;
            }
        }

        /**
         * change coordinates from screen to world
         * @param {number|PIXI.Point} x
         * @param {number} [y]
         * @returns {PIXI.Point}
         */

    }, {
        key: 'toWorld',
        value: function toWorld() {
            if (arguments.length === 2) {
                var x = arguments[0];
                var y = arguments[1];
                return this.toLocal({ x: x, y: y });
            } else {
                return this.toLocal(arguments[0]);
            }
        }

        /**
         * change coordinates from world to screen
         * @param {number|PIXI.Point} x
         * @param {number} [y]
         * @returns {PIXI.Point}
         */

    }, {
        key: 'toScreen',
        value: function toScreen() {
            if (arguments.length === 2) {
                var x = arguments[0];
                var y = arguments[1];
                return this.toGlobal({ x: x, y: y });
            } else {
                var point = arguments[0];
                return this.toGlobal(point);
            }
        }

        /**
         * screen width in world coordinates
         * @type {number}
         * @readonly
         */

    }, {
        key: 'moveCenter',


        /**
         * move center of viewport to point
         * @param {(number|PIXI.Point)} x or point
         * @param {number} [y]
         * @return {Viewport} this
         */
        value: function moveCenter() /*x, y | PIXI.Point*/{
            var x = void 0,
                y = void 0;
            if (!isNaN(arguments[0])) {
                x = arguments[0];
                y = arguments[1];
            } else {
                x = arguments[0].x;
                y = arguments[0].y;
            }
            this.position.set((this.worldScreenWidth / 2 - x) * this.scale.x, (this.worldScreenHeight / 2 - y) * this.scale.y);
            this._reset();
            return this;
        }

        /**
         * top-left corner
         * @type {PIXI.Point}
         */

    }, {
        key: 'moveCorner',


        /**
         * move viewport's top-left corner; also clamps and resets decelerate and bounce (as needed)
         * @param {number|PIXI.Point} x|point
         * @param {number} y
         * @return {Viewport} this
         */
        value: function moveCorner() /*x, y | point*/{
            if (arguments.length === 1) {
                this.position.set(-arguments[0].x * this.scale.x, -arguments[0].y * this.scale.y);
            } else {
                this.position.set(-arguments[0] * this.scale.x, -arguments[1] * this.scale.y);
            }
            this._reset();
            return this;
        }

        /**
         * change zoom so the width fits in the viewport
         * @param {number} [width=this._worldWidth] in world coordinates
         * @param {boolean} [center] maintain the same center
         * @param {boolean} [scaleY=true] whether to set scaleY=scaleX
         * @param {boolean} [noClamp=false] whether to disable clamp-zoom
         * @return {Viewport} this
         */

    }, {
        key: 'fitWidth',
        value: function fitWidth(width, center) {
            var scaleY = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : true;
            var noClamp = arguments[3];

            var save = void 0;
            if (center) {
                save = this.center;
            }
            width = width || this.worldWidth;
            this.scale.x = this.screenWidth / width;

            if (scaleY) {
                this.scale.y = this.scale.x;
            }

            var clampZoom = this.plugins['clamp-zoom'];
            if (!noClamp && clampZoom) {
                clampZoom.clamp();
            }

            if (center) {
                this.moveCenter(save);
            }
            return this;
        }

        /**
         * change zoom so the height fits in the viewport
         * @param {number} [height=this._worldHeight] in world coordinates
         * @param {boolean} [center] maintain the same center of the screen after zoom
         * @param {boolean} [scaleX=true] whether to set scaleX = scaleY
         * @param {boolean} [noClamp=false] whether to disable clamp-zoom
         * @return {Viewport} this
         */

    }, {
        key: 'fitHeight',
        value: function fitHeight(height, center) {
            var scaleX = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : true;
            var noClamp = arguments[3];

            var save = void 0;
            if (center) {
                save = this.center;
            }
            height = height || this.worldHeight;
            this.scale.y = this.screenHeight / height;

            if (scaleX) {
                this.scale.x = this.scale.y;
            }

            var clampZoom = this.plugins['clamp-zoom'];
            if (!noClamp && clampZoom) {
                clampZoom.clamp();
            }

            if (center) {
                this.moveCenter(save);
            }
            return this;
        }

        /**
         * change zoom so it fits the entire world in the viewport
         * @param {boolean} [center] maintain the same center of the screen after zoom
         * @return {Viewport} this
         */

    }, {
        key: 'fitWorld',
        value: function fitWorld(center) {
            var save = void 0;
            if (center) {
                save = this.center;
            }
            this.scale.x = this.screenWidth / this.worldWidth;
            this.scale.y = this.screenHeight / this.worldHeight;
            if (this.scale.x < this.scale.y) {
                this.scale.y = this.scale.x;
            } else {
                this.scale.x = this.scale.y;
            }

            var clampZoom = this.plugins['clamp-zoom'];
            if (clampZoom) {
                clampZoom.clamp();
            }

            if (center) {
                this.moveCenter(save);
            }
            return this;
        }

        /**
         * change zoom so it fits the size or the entire world in the viewport
         * @param {boolean} [center] maintain the same center of the screen after zoom
         * @param {number} [width] desired width
         * @param {number} [height] desired height
         * @return {Viewport} this
         */

    }, {
        key: 'fit',
        value: function fit(center, width, height) {
            var save = void 0;
            if (center) {
                save = this.center;
            }
            width = width || this.worldWidth;
            height = height || this.worldHeight;
            this.scale.x = this.screenWidth / width;
            this.scale.y = this.screenHeight / height;
            if (this.scale.x < this.scale.y) {
                this.scale.y = this.scale.x;
            } else {
                this.scale.x = this.scale.y;
            }
            var clampZoom = this.plugins['clamp-zoom'];
            if (clampZoom) {
                clampZoom.clamp();
            }
            if (center) {
                this.moveCenter(save);
            }
            return this;
        }

        /**
         * zoom viewport by a certain percent (in both x and y direction)
         * @param {number} percent change (e.g., 0.25 would increase a starting scale of 1.0 to 1.25)
         * @param {boolean} [center] maintain the same center of the screen after zoom
         * @return {Viewport} the viewport
         */

    }, {
        key: 'zoomPercent',
        value: function zoomPercent(percent, center) {
            var save = void 0;
            if (center) {
                save = this.center;
            }
            var scale = this.scale.x + this.scale.x * percent;
            this.scale.set(scale);
            var clampZoom = this.plugins['clamp-zoom'];
            if (clampZoom) {
                clampZoom.clamp();
            }
            if (center) {
                this.moveCenter(save);
            }
            return this;
        }

        /**
         * zoom viewport by increasing/decreasing width by a certain number of pixels
         * @param {number} change in pixels
         * @param {boolean} [center] maintain the same center of the screen after zoom
         * @return {Viewport} the viewport
         */

    }, {
        key: 'zoom',
        value: function zoom(change, center) {
            this.fitWidth(change + this.worldScreenWidth, center);
            return this;
        }

        /**
         * @param {object} [options]
         * @param {number} [options.width] the desired width to snap (to maintain aspect ratio, choose only width or height)
         * @param {number} [options.height] the desired height to snap (to maintain aspect ratio, choose only width or height)
         * @param {number} [options.time=1000]
         * @param {string|function} [options.ease=easeInOutSine] ease function or name (see http://easings.net/ for supported names)
         * @param {PIXI.Point} [options.center] place this point at center during zoom instead of center of the viewport
         * @param {boolean} [options.interrupt=true] pause snapping with any user input on the viewport
         * @param {boolean} [options.removeOnComplete] removes this plugin after snapping is complete
         * @param {boolean} [options.removeOnInterrupt] removes this plugin if interrupted by any user input
         * @param {boolean} [options.forceStart] starts the snap immediately regardless of whether the viewport is at the desired zoom
         * @param {boolean} [options.noMove] zoom but do not move
         */

    }, {
        key: 'snapZoom',
        value: function snapZoom(options) {
            this.plugins['snap-zoom'] = new SnapZoom(this, options);
            this.pluginsSort();
            return this;
        }

        /**
         * @private
         * @typedef OutOfBounds
         * @type {object}
         * @property {boolean} left
         * @property {boolean} right
         * @property {boolean} top
         * @property {boolean} bottom
         */

        /**
         * is container out of world bounds
         * @return {OutOfBounds}
         * @private
         */

    }, {
        key: 'OOB',
        value: function OOB() {
            var result = {};
            result.left = this.left < 0;
            result.right = this.right > this._worldWidth;
            result.top = this.top < 0;
            result.bottom = this.bottom > this._worldHeight;
            result.cornerPoint = {
                x: this._worldWidth * this.scale.x - this._screenWidth,
                y: this._worldHeight * this.scale.y - this._screenHeight
            };
            return result;
        }

        /**
         * world coordinates of the right edge of the screen
         * @type {number}
         */

    }, {
        key: 'countDownPointers',


        /**
         * count of mouse/touch pointers that are down on the viewport
         * @private
         * @return {number}
         */
        value: function countDownPointers() {
            return (this.isMouseDown ? 1 : 0) + this.touches.length;
        }

        /**
         * array of touch pointers that are down on the viewport
         * @private
         * @return {PIXI.InteractionTrackingData[]}
         */

    }, {
        key: 'getTouchPointers',
        value: function getTouchPointers() {
            var results = [];
            var pointers = this.trackedPointers;
            for (var key in pointers) {
                var pointer = pointers[key];
                if (this.touches.indexOf(pointer.pointerId) !== -1) {
                    results.push(pointer);
                }
            }
            return results;
        }

        /**
         * array of pointers that are down on the viewport
         * @private
         * @return {PIXI.InteractionTrackingData[]}
         */

    }, {
        key: 'getPointers',
        value: function getPointers() {
            var results = [];
            var pointers = this.trackedPointers;
            for (var key in pointers) {
                results.push(pointers[key]);
            }
            return results;
        }

        /**
         * clamps and resets bounce and decelerate (as needed) after manually moving viewport
         * @private
         */

    }, {
        key: '_reset',
        value: function _reset() {
            if (this.plugins['bounce']) {
                this.plugins['bounce'].reset();
                this.plugins['bounce'].bounce();
            }
            if (this.plugins['decelerate']) {
                this.plugins['decelerate'].reset();
            }
            if (this.plugins['snap']) {
                this.plugins['snap'].reset();
            }
            if (this.plugins['clamp']) {
                this.plugins['clamp'].update();
            }
            if (this.plugins['clamp-zoom']) {
                this.plugins['clamp-zoom'].clamp();
            }
        }

        // PLUGINS

        /**
         * Inserts a user plugin into the viewport
         * @param {string} name of plugin
         * @param {Plugin} plugin - instantiated Plugin class
         * @param {number} [index=last element] plugin is called current order: 'drag', 'pinch', 'wheel', 'follow', 'mouse-edges', 'decelerate', 'bounce', 'snap-zoom', 'clamp-zoom', 'snap', 'clamp'
         */

    }, {
        key: 'userPlugin',
        value: function userPlugin(name, plugin) {
            var index = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : PLUGIN_ORDER.length;

            this.plugins[name] = plugin;
            var current = PLUGIN_ORDER.indexOf(name);
            if (current !== -1) {
                PLUGIN_ORDER.splice(current, 1);
            }
            PLUGIN_ORDER.splice(index, 0, name);
            this.pluginsSort();
        }

        /**
         * removes installed plugin
         * @param {string} type of plugin (e.g., 'drag', 'pinch')
         */

    }, {
        key: 'removePlugin',
        value: function removePlugin(type) {
            if (this.plugins[type]) {
                this.plugins[type] = null;
                this.emit(type + '-remove');
                this.pluginsSort();
            }
        }

        /**
         * pause plugin
         * @param {string} type of plugin (e.g., 'drag', 'pinch')
         */

    }, {
        key: 'pausePlugin',
        value: function pausePlugin(type) {
            if (this.plugins[type]) {
                this.plugins[type].pause();
            }
        }

        /**
         * resume plugin
         * @param {string} type of plugin (e.g., 'drag', 'pinch')
         */

    }, {
        key: 'resumePlugin',
        value: function resumePlugin(type) {
            if (this.plugins[type]) {
                this.plugins[type].resume();
            }
        }

        /**
         * sort plugins for updates
         * @private
         */

    }, {
        key: 'pluginsSort',
        value: function pluginsSort() {
            this.pluginsList = [];
            var _iteratorNormalCompletion7 = true;
            var _didIteratorError7 = false;
            var _iteratorError7 = undefined;

            try {
                for (var _iterator7 = PLUGIN_ORDER[Symbol.iterator](), _step7; !(_iteratorNormalCompletion7 = (_step7 = _iterator7.next()).done); _iteratorNormalCompletion7 = true) {
                    var plugin = _step7.value;

                    if (this.plugins[plugin]) {
                        this.pluginsList.push(this.plugins[plugin]);
                    }
                }
            } catch (err) {
                _didIteratorError7 = true;
                _iteratorError7 = err;
            } finally {
                try {
                    if (!_iteratorNormalCompletion7 && _iterator7.return) {
                        _iterator7.return();
                    }
                } finally {
                    if (_didIteratorError7) {
                        throw _iteratorError7;
                    }
                }
            }
        }

        /**
         * enable one-finger touch to drag
         * @param {object} [options]
         * @param {string} [options.direction=all] direction to drag (all, x, or y)
         * @param {boolean} [options.wheel=true] use wheel to scroll in y direction (unless wheel plugin is active)
         * @param {number} [options.wheelScroll=1] number of pixels to scroll with each wheel spin
         * @param {boolean} [options.reverse] reverse the direction of the wheel scroll
         * @param {boolean|string} [options.clampWheel] (true, x, or y) clamp wheel (to avoid weird bounce with mouse wheel)
         * @param {string} [options.underflow=center] (top/bottom/center and left/right/center, or center) where to place world if too small for screen
         * @param {number} [options.factor=1] factor to multiply drag to increase the speed of movement
         * @param {string} [options.mouseButtons=all] changes which mouse buttons trigger drag, use: 'all', 'left', right' 'middle', or some combination, like, 'middle-right'
         */

    }, {
        key: 'drag',
        value: function drag(options) {
            this.plugins['drag'] = new Drag(this, options);
            this.pluginsSort();
            return this;
        }

        /**
         * clamp to world boundaries or other provided boundaries
         * NOTES:
         *   clamp is disabled if called with no options; use { direction: 'all' } for all edge clamping
         *   screenWidth, screenHeight, worldWidth, and worldHeight needs to be set for this to work properly
         * @param {object} [options]
         * @param {(number|boolean)} [options.left] clamp left; true=0
         * @param {(number|boolean)} [options.right] clamp right; true=viewport.worldWidth
         * @param {(number|boolean)} [options.top] clamp top; true=0
         * @param {(number|boolean)} [options.bottom] clamp bottom; true=viewport.worldHeight
         * @param {string} [options.direction] (all, x, or y) using clamps of [0, viewport.worldWidth/viewport.worldHeight]; replaces left/right/top/bottom if set
         * @param {string} [options.underflow=center] (none OR (top/bottom/center and left/right/center) OR center) where to place world if too small for screen (e.g., top-right, center, none, bottomleft)
         * @return {Viewport} this
         */

    }, {
        key: 'clamp',
        value: function clamp(options) {
            this.plugins['clamp'] = new Clamp(this, options);
            this.pluginsSort();
            return this;
        }

        /**
         * decelerate after a move
         * @param {object} [options]
         * @param {number} [options.friction=0.95] percent to decelerate after movement
         * @param {number} [options.bounce=0.8] percent to decelerate when past boundaries (only applicable when viewport.bounce() is active)
         * @param {number} [options.minSpeed=0.01] minimum velocity before stopping/reversing acceleration
         * @return {Viewport} this
         */

    }, {
        key: 'decelerate',
        value: function decelerate(options) {
            this.plugins['decelerate'] = new Decelerate(this, options);
            this.pluginsSort();
            return this;
        }

        /**
         * bounce on borders
         * NOTE: screenWidth, screenHeight, worldWidth, and worldHeight needs to be set for this to work properly
         * @param {object} [options]
         * @param {string} [options.sides=all] all, horizontal, vertical, or combination of top, bottom, right, left (e.g., 'top-bottom-right')
         * @param {number} [options.friction=0.5] friction to apply to decelerate if active
         * @param {number} [options.time=150] time in ms to finish bounce
         * @param {string|function} [options.ease=easeInOutSine] ease function or name (see http://easings.net/ for supported names)
         * @param {string} [options.underflow=center] (top/bottom/center and left/right/center, or center) where to place world if too small for screen
         * @return {Viewport} this
         */

    }, {
        key: 'bounce',
        value: function bounce(options) {
            this.plugins['bounce'] = new Bounce(this, options);
            this.pluginsSort();
            return this;
        }

        /**
         * enable pinch to zoom and two-finger touch to drag
         * NOTE: screenWidth, screenHeight, worldWidth, and worldHeight needs to be set for this to work properly
         * @param {number} [options.percent=1.0] percent to modify pinch speed
         * @param {boolean} [options.noDrag] disable two-finger dragging
         * @param {PIXI.Point} [options.center] place this point at center during zoom instead of center of two fingers
         * @return {Viewport} this
         */

    }, {
        key: 'pinch',
        value: function pinch(options) {
            this.plugins['pinch'] = new Pinch(this, options);
            this.pluginsSort();
            return this;
        }

        /**
         * snap to a point
         * @param {number} x
         * @param {number} y
         * @param {object} [options]
         * @param {boolean} [options.topLeft] snap to the top-left of viewport instead of center
         * @param {number} [options.friction=0.8] friction/frame to apply if decelerate is active
         * @param {number} [options.time=1000]
         * @param {string|function} [options.ease=easeInOutSine] ease function or name (see http://easings.net/ for supported names)
         * @param {boolean} [options.interrupt=true] pause snapping with any user input on the viewport
         * @param {boolean} [options.removeOnComplete] removes this plugin after snapping is complete
         * @param {boolean} [options.removeOnInterrupt] removes this plugin if interrupted by any user input
         * @param {boolean} [options.forceStart] starts the snap immediately regardless of whether the viewport is at the desired location
         * @return {Viewport} this
         */

    }, {
        key: 'snap',
        value: function snap(x, y, options) {
            this.plugins['snap'] = new Snap(this, x, y, options);
            this.pluginsSort();
            return this;
        }

        /**
         * follow a target
         * NOTES:
         *    - uses the (x, y) as the center to follow; for PIXI.Sprite to work properly, use sprite.anchor.set(0.5)
         *    - options.acceleration is not perfect as it doesn't know the velocity of the target;
         *      it does add acceleration to the start of movement and deceleration to the end of movement when the target is stopped
         * @param {PIXI.DisplayObject} target to follow (object must include {x: x-coordinate, y: y-coordinate})
         * @param {object} [options]
         * @param {number} [options.speed=0] to follow in pixels/frame (0=teleport to location)
         * @param {number} [options.acceleration] set acceleration to accelerate and decelerate at this rate; speed cannot be 0 to use acceleration
         * @param {number} [options.radius] radius (in world coordinates) of center circle where movement is allowed without moving the viewport
         * @return {Viewport} this
         */

    }, {
        key: 'follow',
        value: function follow(target, options) {
            this.plugins['follow'] = new Follow(this, target, options);
            this.pluginsSort();
            return this;
        }

        /**
         * zoom using mouse wheel
         * @param {object} [options]
         * @param {number} [options.percent=0.1] percent to scroll with each spin
         * @param {boolean} [options.reverse] reverse the direction of the scroll
         * @param {PIXI.Point} [options.center] place this point at center during zoom instead of current mouse position
         * @return {Viewport} this
         */

    }, {
        key: 'wheel',
        value: function wheel(options) {
            this.plugins['wheel'] = new Wheel(this, options);
            this.pluginsSort();
            return this;
        }

        /**
         * enable clamping of zoom to constraints
         * NOTE: screenWidth, screenHeight, worldWidth, and worldHeight needs to be set for this to work properly
         * @param {object} [options]
         * @param {number} [options.minWidth] minimum width
         * @param {number} [options.minHeight] minimum height
         * @param {number} [options.maxWidth] maximum width
         * @param {number} [options.maxHeight] maximum height
         * @return {Viewport} this
         */

    }, {
        key: 'clampZoom',
        value: function clampZoom(options) {
            this.plugins['clamp-zoom'] = new ClampZoom(this, options);
            this.pluginsSort();
            return this;
        }

        /**
         * Scroll viewport when mouse hovers near one of the edges or radius-distance from center of screen.
         * @param {object} [options]
         * @param {number} [options.radius] distance from center of screen in screen pixels
         * @param {number} [options.distance] distance from all sides in screen pixels
         * @param {number} [options.top] alternatively, set top distance (leave unset for no top scroll)
         * @param {number} [options.bottom] alternatively, set bottom distance (leave unset for no bottom scroll)
         * @param {number} [options.left] alternatively, set left distance (leave unset for no left scroll)
         * @param {number} [options.right] alternatively, set right distance (leave unset for no right scroll)
         * @param {number} [options.speed=8] speed in pixels/frame to scroll viewport
         * @param {boolean} [options.reverse] reverse direction of scroll
         * @param {boolean} [options.noDecelerate] don't use decelerate plugin even if it's installed
         * @param {boolean} [options.linear] if using radius, use linear movement (+/- 1, +/- 1) instead of angled movement (Math.cos(angle from center), Math.sin(angle from center))
         * @param {boolean} [options.allowButtons] allows plugin to continue working even when there's a mousedown event
         */

    }, {
        key: 'mouseEdges',
        value: function mouseEdges(options) {
            this.plugins['mouse-edges'] = new MouseEdges(this, options);
            this.pluginsSort();
            return this;
        }

        /**
         * pause viewport (including animation updates such as decelerate)
         * NOTE: when setting pause=true, all touches and mouse actions are cleared (i.e., if mousedown was active, it becomes inactive for purposes of the viewport)
         * @type {boolean}
         */

    }, {
        key: 'ensureVisible',


        /**
         * move the viewport so the bounding box is visible
         * @param {number} x
         * @param {number} y
         * @param {number} width
         * @param {number} height
         */
        value: function ensureVisible(x, y, width, height) {
            if (x < this.left) {
                this.left = x;
            } else if (x + width > this.right) {
                this.right = x + width;
            }
            if (y < this.top) {
                this.top = y;
            } else if (y + height > this.bottom) {
                this.bottom = y + height;
            }
        }
    }, {
        key: 'screenWidth',
        get: function get() {
            return this._screenWidth;
        },
        set: function set(value) {
            this._screenWidth = value;
        }

        /**
         * screen height in screen pixels
         * @type {number}
         */

    }, {
        key: 'screenHeight',
        get: function get() {
            return this._screenHeight;
        },
        set: function set(value) {
            this._screenHeight = value;
        }

        /**
         * world width in pixels
         * @type {number}
         */

    }, {
        key: 'worldWidth',
        get: function get() {
            if (this._worldWidth) {
                return this._worldWidth;
            } else {
                return this.width;
            }
        },
        set: function set(value) {
            this._worldWidth = value;
            this.resizePlugins();
        }

        /**
         * world height in pixels
         * @type {number}
         */

    }, {
        key: 'worldHeight',
        get: function get() {
            if (this._worldHeight) {
                return this._worldHeight;
            } else {
                return this.height;
            }
        },
        set: function set(value) {
            this._worldHeight = value;
            this.resizePlugins();
        }
    }, {
        key: 'worldScreenWidth',
        get: function get() {
            return this.screenWidth / this.scale.x;
        }

        /**
         * screen height in world coordinates
         * @type {number}
         * @readonly
         */

    }, {
        key: 'worldScreenHeight',
        get: function get() {
            return this.screenHeight / this.scale.y;
        }

        /**
         * world width in screen coordinates
         * @type {number}
         * @readonly
         */

    }, {
        key: 'screenWorldWidth',
        get: function get() {
            return this.worldWidth * this.scale.x;
        }

        /**
         * world height in screen coordinates
         * @type {number}
         * @readonly
         */

    }, {
        key: 'screenWorldHeight',
        get: function get() {
            return this.worldHeight * this.scale.y;
        }

        /**
         * get center of screen in world coordinates
         * @type {PIXI.Point}
         */

    }, {
        key: 'center',
        get: function get() {
            return new PIXI.Point(this.worldScreenWidth / 2 - this.x / this.scale.x, this.worldScreenHeight / 2 - this.y / this.scale.y);
        },
        set: function set(value) {
            this.moveCenter(value);
        }
    }, {
        key: 'corner',
        get: function get() {
            return new PIXI.Point(-this.x / this.scale.x, -this.y / this.scale.y);
        },
        set: function set(value) {
            this.moveCorner(value);
        }
    }, {
        key: 'right',
        get: function get() {
            return -this.x / this.scale.x + this.worldScreenWidth;
        },
        set: function set(value) {
            this.x = -value * this.scale.x + this.screenWidth;
            this._reset();
        }

        /**
         * world coordinates of the left edge of the screen
         * @type {number}
         */

    }, {
        key: 'left',
        get: function get() {
            return -this.x / this.scale.x;
        },
        set: function set(value) {
            this.x = -value * this.scale.x;
            this._reset();
        }

        /**
         * world coordinates of the top edge of the screen
         * @type {number}
         */

    }, {
        key: 'top',
        get: function get() {
            return -this.y / this.scale.y;
        },
        set: function set(value) {
            this.y = -value * this.scale.y;
            this._reset();
        }

        /**
         * world coordinates of the bottom edge of the screen
         * @type {number}
         */

    }, {
        key: 'bottom',
        get: function get() {
            return -this.y / this.scale.y + this.worldScreenHeight;
        },
        set: function set(value) {
            this.y = -value * this.scale.y + this.screenHeight;
            this._reset();
        }
        /**
         * determines whether the viewport is dirty (i.e., needs to be renderered to the screen because of a change)
         * @type {boolean}
         */

    }, {
        key: 'dirty',
        get: function get() {
            return this._dirty;
        },
        set: function set(value) {
            this._dirty = value;
        }

        /**
         * permanently changes the Viewport's hitArea
         * NOTE: normally the hitArea = PIXI.Rectangle(Viewport.left, Viewport.top, Viewport.worldScreenWidth, Viewport.worldScreenHeight)
         * @type {(PIXI.Rectangle|PIXI.Circle|PIXI.Ellipse|PIXI.Polygon|PIXI.RoundedRectangle)}
         */

    }, {
        key: 'forceHitArea',
        get: function get() {
            return this._forceHitArea;
        },
        set: function set(value) {
            if (value) {
                this._forceHitArea = value;
                this.hitArea = value;
            } else {
                this._forceHitArea = false;
                this.hitArea = new PIXI.Rectangle(0, 0, this.worldWidth, this.worldHeight);
            }
        }
    }, {
        key: 'pause',
        get: function get() {
            return this._pause;
        },
        set: function set(value) {
            this._pause = value;
            this.lastViewport = null;
            this.moving = false;
            this.zooming = false;
            if (value) {
                this.touches = [];
                this.isMouseDown = false;
            }
        }
    }]);

    return Viewport;
}(PIXI.Container);

/**
 * fires after a mouse or touch click
 * @event Viewport#clicked
 * @type {object}
 * @property {PIXI.Point} screen
 * @property {PIXI.Point} world
 * @property {Viewport} viewport
 */

/**
 * fires when a drag starts
 * @event Viewport#drag-start
 * @type {object}
 * @property {PIXI.Point} screen
 * @property {PIXI.Point} world
 * @property {Viewport} viewport
 */

/**
 * fires when a drag ends
 * @event Viewport#drag-end
 * @type {object}
 * @property {PIXI.Point} screen
 * @property {PIXI.Point} world
 * @property {Viewport} viewport
 */

/**
 * fires when a pinch starts
 * @event Viewport#pinch-start
 * @type {Viewport}
 */

/**
 * fires when a pinch end
 * @event Viewport#pinch-end
 * @type {Viewport}
 */

/**
 * fires when a snap starts
 * @event Viewport#snap-start
 * @type {Viewport}
 */

/**
 * fires when a snap ends
 * @event Viewport#snap-end
 * @type {Viewport}
 */

/**
 * fires when a snap-zoom starts
 * @event Viewport#snap-zoom-start
 * @type {Viewport}
 */

/**
 * fires when a snap-zoom ends
 * @event Viewport#snap-zoom-end
 * @type {Viewport}
 */

/**
 * fires when a bounce starts in the x direction
 * @event Viewport#bounce-x-start
 * @type {Viewport}
 */

/**
 * fires when a bounce ends in the x direction
 * @event Viewport#bounce-x-end
 * @type {Viewport}
 */

/**
 * fires when a bounce starts in the y direction
 * @event Viewport#bounce-y-start
 * @type {Viewport}
 */

/**
 * fires when a bounce ends in the y direction
 * @event Viewport#bounce-y-end
 * @type {Viewport}
 */

/**
 * fires when for a mouse wheel event
 * @event Viewport#wheel
 * @type {object}
 * @property {object} wheel
 * @property {number} wheel.dx
 * @property {number} wheel.dy
 * @property {number} wheel.dz
 * @property {Viewport} viewport
 */

/**
 * fires when a wheel-scroll occurs
 * @event Viewport#wheel-scroll
 * @type {Viewport}
 */

/**
 * fires when a mouse-edge starts to scroll
 * @event Viewport#mouse-edge-start
 * @type {Viewport}
 */

/**
 * fires when the mouse-edge scrolling ends
 * @event Viewport#mouse-edge-end
 * @type {Viewport}
 */

/**
 * fires when viewport moves through UI interaction, deceleration, or follow
 * @event Viewport#moved
 * @type {object}
 * @property {Viewport} viewport
 * @property {string} type (drag, snap, pinch, follow, bounce-x, bounce-y, clamp-x, clamp-y, decelerate, mouse-edges, wheel)
 */

/**
 * fires when viewport moves through UI interaction, deceleration, or follow
 * @event Viewport#zoomed
 * @type {object}
 * @property {Viewport} viewport
 * @property {string} type (drag-zoom, pinch, wheel, clamp-zoom)
 */

/**
 * fires when viewport stops moving for any reason
 * @event Viewport#moved-end
 * @type {Viewport}
 */

/**
 * fires when viewport stops zooming for any rason
 * @event Viewport#zoomed-end
 * @type {Viewport}
 */

if (typeof PIXI !== 'undefined') {
    if (PIXI.extras) {
        PIXI.extras.Viewport = Viewport;
    } else {
        PIXI.extras = { Viewport: Viewport };
    }
}

module.exports = Viewport;
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uL3NyYy92aWV3cG9ydC5qcyJdLCJuYW1lcyI6WyJQSVhJIiwicmVxdWlyZSIsInV0aWxzIiwiRHJhZyIsIlBpbmNoIiwiQ2xhbXAiLCJDbGFtcFpvb20iLCJEZWNlbGVyYXRlIiwiQm91bmNlIiwiU25hcCIsIlNuYXBab29tIiwiRm9sbG93IiwiV2hlZWwiLCJNb3VzZUVkZ2VzIiwiUExVR0lOX09SREVSIiwiVmlld3BvcnQiLCJvcHRpb25zIiwicGx1Z2lucyIsInBsdWdpbnNMaXN0IiwiX3NjcmVlbldpZHRoIiwic2NyZWVuV2lkdGgiLCJ3aW5kb3ciLCJpbm5lcldpZHRoIiwiX3NjcmVlbkhlaWdodCIsInNjcmVlbkhlaWdodCIsImlubmVySGVpZ2h0IiwiX3dvcmxkV2lkdGgiLCJ3b3JsZFdpZHRoIiwiX3dvcmxkSGVpZ2h0Iiwid29ybGRIZWlnaHQiLCJoaXRBcmVhRnVsbFNjcmVlbiIsImRlZmF1bHRzIiwiZm9yY2VIaXRBcmVhIiwicGFzc2l2ZVdoZWVsIiwic3RvcEV2ZW50Iiwic3RvcFByb3BhZ2F0aW9uIiwidGhyZXNob2xkIiwiaW50ZXJhY3Rpb24iLCJkaXYiLCJkaXZXaGVlbCIsImRvY3VtZW50IiwiYm9keSIsImxpc3RlbmVycyIsIm9uY29udGV4dG1lbnUiLCJlIiwicHJldmVudERlZmF1bHQiLCJ0b3VjaGVzIiwibm9UaWNrZXIiLCJ0aWNrZXIiLCJUaWNrZXIiLCJzaGFyZWQiLCJ0aWNrZXJGdW5jdGlvbiIsInVwZGF0ZSIsImVsYXBzZWRNUyIsImFkZCIsInJlbW92ZSIsInJlbW92ZUV2ZW50TGlzdGVuZXIiLCJ3aGVlbEZ1bmN0aW9uIiwicmVtb3ZlTGlzdGVuZXJzIiwiZWxhcHNlZCIsInBhdXNlIiwicGx1Z2luIiwibGFzdFZpZXdwb3J0IiwieCIsInkiLCJtb3ZpbmciLCJlbWl0Iiwic2NhbGVYIiwic2NhbGUiLCJzY2FsZVkiLCJ6b29taW5nIiwiaGl0QXJlYSIsImxlZnQiLCJ0b3AiLCJ3aWR0aCIsIndvcmxkU2NyZWVuV2lkdGgiLCJoZWlnaHQiLCJ3b3JsZFNjcmVlbkhlaWdodCIsIl9kaXJ0eSIsInJlc2l6ZVBsdWdpbnMiLCJyZXNpemUiLCJpbnRlcmFjdGl2ZSIsIlJlY3RhbmdsZSIsIm9uIiwiZG93biIsIm1vdmUiLCJ1cCIsImhhbmRsZVdoZWVsIiwiYWRkRXZlbnRMaXN0ZW5lciIsInBhc3NpdmUiLCJpc01vdXNlRG93biIsIndvcmxkVmlzaWJsZSIsImRhdGEiLCJwb2ludGVyVHlwZSIsInB1c2giLCJwb2ludGVySWQiLCJjb3VudERvd25Qb2ludGVycyIsImxhc3QiLCJnbG9iYWwiLCJjbG9uZSIsImRlY2VsZXJhdGUiLCJib3VuY2UiLCJpc0FjdGl2ZSIsImNsaWNrZWRBdmFpbGFibGUiLCJzdG9wIiwiY2hhbmdlIiwiTWF0aCIsImFicyIsImRpc3RYIiwiZGlzdFkiLCJjaGVja1RocmVzaG9sZCIsImkiLCJsZW5ndGgiLCJzcGxpY2UiLCJzY3JlZW4iLCJ3b3JsZCIsInRvV29ybGQiLCJ2aWV3cG9ydCIsImV2dCIsInBvaW50IiwiUG9pbnQiLCJtYXBQb3NpdGlvblRvUG9pbnQiLCJjbGllbnRYIiwiY2xpZW50WSIsInRvTG9jYWwiLCJnZXRQb2ludGVyUG9zaXRpb24iLCJyaWdodCIsImJvdHRvbSIsInJlc3VsdCIsIndoZWVsIiwiYXJndW1lbnRzIiwidG9HbG9iYWwiLCJpc05hTiIsInBvc2l0aW9uIiwic2V0IiwiX3Jlc2V0IiwiY2VudGVyIiwibm9DbGFtcCIsInNhdmUiLCJjbGFtcFpvb20iLCJjbGFtcCIsIm1vdmVDZW50ZXIiLCJwZXJjZW50IiwiZml0V2lkdGgiLCJwbHVnaW5zU29ydCIsImNvcm5lclBvaW50IiwicmVzdWx0cyIsInBvaW50ZXJzIiwidHJhY2tlZFBvaW50ZXJzIiwia2V5IiwicG9pbnRlciIsImluZGV4T2YiLCJyZXNldCIsIm5hbWUiLCJpbmRleCIsImN1cnJlbnQiLCJ0eXBlIiwicmVzdW1lIiwidGFyZ2V0IiwidmFsdWUiLCJtb3ZlQ29ybmVyIiwiX2ZvcmNlSGl0QXJl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TUFBTCxHQUFjLEVBQUVySixrQkFBRixFQUFkO0FBQ0g7QUFDSjs7QUFFRHNKLE9BQU9DLE9BQVAsR0FBaUJ2SixRQUFqQiIsImZpbGUiOiJ2aWV3cG9ydC5qcyIsInNvdXJjZXNDb250ZW50IjpbImNvbnN0IFBJWEkgPSByZXF1aXJlKCdwaXhpLmpzJylcclxuXHJcbmNvbnN0IHV0aWxzID0gcmVxdWlyZSgnLi91dGlscycpXHJcbmNvbnN0IERyYWcgPSByZXF1aXJlKCcuL2RyYWcnKVxyXG5jb25zdCBQaW5jaCA9IHJlcXVpcmUoJy4vcGluY2gnKVxyXG5jb25zdCBDbGFtcCA9IHJlcXVpcmUoJy4vY2xhbXAnKVxyXG5jb25zdCBDbGFtcFpvb20gPSByZXF1aXJlKCcuL2NsYW1wLXpvb20nKVxyXG5jb25zdCBEZWNlbGVyYXRlID0gcmVxdWlyZSgnLi9kZWNlbGVyYXRlJylcclxuY29uc3QgQm91bmNlID0gcmVxdWlyZSgnLi9ib3VuY2UnKVxyXG5jb25zdCBTbmFwID0gcmVxdWlyZSgnLi9zbmFwJylcclxuY29uc3QgU25hcFpvb20gPSByZXF1aXJlKCcuL3NuYXAtem9vbScpXHJcbmNvbnN0IEZvbGxvdyA9IHJlcXVpcmUoJy4vZm9sbG93JylcclxuY29uc3QgV2hlZWwgPSByZXF1aXJlKCcuL3doZWVsJylcclxuY29uc3QgTW91c2VFZGdlcyA9IHJlcXVpcmUoJy4vbW91c2UtZWRnZXMnKVxyXG5cclxuY29uc3QgUExVR0lOX09SREVSID0gWydkcmFnJywgJ3BpbmNoJywgJ3doZWVsJywgJ2ZvbGxvdycsICdtb3VzZS1lZGdlcycsICdkZWNlbGVyYXRlJywgJ2JvdW5jZScsICdzbmFwLXpvb20nLCAnY2xhbXAtem9vbScsICdzbmFwJywgJ2NsYW1wJ11cclxuXHJcbmNsYXNzIFZpZXdwb3J0IGV4dGVuZHMgUElYSS5Db250YWluZXJcclxue1xyXG4gICAgLyoqXHJcbiAgICAgKiBAZXh0ZW5kcyBQSVhJLkNvbnRhaW5lclxyXG4gICAgICogQGV4dGVuZHMgRXZlbnRFbWl0dGVyXHJcbiAgICAgKiBAcGFyYW0ge29iamVjdH0gW29wdGlvbnNdXHJcbiAgICAgKiBAcGFyYW0ge251bWJlcn0gW29wdGlvbnMuc2NyZWVuV2lkdGg9d2luZG93LmlubmVyV2lkdGhdXHJcbiAgICAgKiBAcGFyYW0ge251bWJlcn0gW29wdGlvbnMuc2NyZWVuSGVpZ2h0PXdpbmRvdy5pbm5lckhlaWdodF1cclxuICAgICAqIEBwYXJhbSB7bnVtYmVyfSBbb3B0aW9ucy53b3JsZFdpZHRoPXRoaXMud2lkdGhdXHJcbiAgICAgKiBAcGFyYW0ge251bWJlcn0gW29wdGlvbnMud29ybGRIZWlnaHQ9dGhpcy5oZWlnaHRdXHJcbiAgICAgKiBAcGFyYW0ge251bWJlcn0gW29wdGlvbnMudGhyZXNob2xkPTVdIG51bWJlciBvZiBwaXhlbHMgdG8gbW92ZSB0byB0cmlnZ2VyIGFuIGlucHV0IGV2ZW50IChlLmcuLCBkcmFnLCBwaW5jaCkgb3IgZGlzYWJsZSBhIGNsaWNrZWQgZXZlbnRcclxuICAgICAqIEBwYXJhbSB7Ym9vbGVhbn0gW29wdGlvbnMucGFzc2l2ZVdoZWVsPXRydWVdIHdoZXRoZXIgdGhlICd3aGVlbCcgZXZlbnQgaXMgc2V0IHRvIHBhc3NpdmVcclxuICAgICAqIEBwYXJhbSB7Ym9vbGVhbn0gW29wdGlvbnMuc3RvcFByb3BhZ2F0aW9uPWZhbHNlXSB3aGV0aGVyIHRvIHN0b3BQcm9wYWdhdGlvbiBvZiBldmVudHMgdGhhdCBpbXBhY3QgdGhlIHZpZXdwb3J0XHJcbiAgICAgKiBAcGFyYW0geyhQSVhJLlJlY3RhbmdsZXxQSVhJLkNpcmNsZXxQSVhJLkVsbGlwc2V8UElYSS5Qb2x5Z29ufFBJWEkuUm91bmRlZFJlY3RhbmdsZSl9IFtvcHRpb25zLmZvcmNlSGl0QXJlYV0gY2hhbmdlIHRoZSBkZWZhdWx0IGhpdEFyZWEgZnJvbSB3b3JsZCBzaXplIHRvIGEgbmV3IHZhbHVlXHJcbiAgICAgKiBAcGFyYW0ge2Jvb2xlYW59IFtvcHRpb25zLm5vVGlja2VyXSBzZXQgdGhpcyBpZiB5b3Ugd2FudCB0byBtYW51YWxseSBjYWxsIHVwZGF0ZSgpIGZ1bmN0aW9uIG9uIGVhY2ggZnJhbWVcclxuICAgICAqIEBwYXJhbSB7UElYSS50aWNrZXIuVGlja2VyfSBbb3B0aW9ucy50aWNrZXI9UElYSS5UaWNrZXIuc2hhcmVkfHxQSVhJLnRpY2tlci5zaGFyZWRdIHVzZSB0aGlzIFBJWEkudGlja2VyIGZvciB1cGRhdGVzXHJcbiAgICAgKiBAcGFyYW0ge1BJWEkuSW50ZXJhY3Rpb25NYW5hZ2VyfSBbb3B0aW9ucy5pbnRlcmFjdGlvbj1udWxsXSBJbnRlcmFjdGlvbk1hbmFnZXIsIGF2YWlsYWJsZSBmcm9tIGluc3RhbnRpYXRlZCBXZWJHTFJlbmRlcmVyL0NhbnZhc1JlbmRlcmVyLnBsdWdpbnMuaW50ZXJhY3Rpb24gLSB1c2VkIHRvIGNhbGN1bGF0ZSBwb2ludGVyIHBvc3Rpb24gcmVsYXRpdmUgdG8gY2FudmFzIGxvY2F0aW9uIG9uIHNjcmVlblxyXG4gICAgICogQHBhcmFtIHtIVE1MRWxlbWVudH0gW29wdGlvbnMuZGl2V2hlZWw9ZG9jdW1lbnQuYm9keV0gZGl2IHRvIGF0dGFjaCB0aGUgd2hlZWwgZXZlbnRcclxuICAgICAqIEBmaXJlcyBjbGlja2VkXHJcbiAgICAgKiBAZmlyZXMgZHJhZy1zdGFydFxyXG4gICAgICogQGZpcmVzIGRyYWctZW5kXHJcbiAgICAgKiBAZmlyZXMgZHJhZy1yZW1vdmVcclxuICAgICAqIEBmaXJlcyBwaW5jaC1zdGFydFxyXG4gICAgICogQGZpcmVzIHBpbmNoLWVuZFxyXG4gICAgICogQGZpcmVzIHBpbmNoLXJlbW92ZVxyXG4gICAgICogQGZpcmVzIHNuYXAtc3RhcnRcclxuICAgICAqIEBmaXJlcyBzbmFwLWVuZFxyXG4gICAgICogQGZpcmVzIHNuYXAtcmVtb3ZlXHJcbiAgICAgKiBAZmlyZXMgc25hcC16b29tLXN0YXJ0XHJcbiAgICAgKiBAZmlyZXMgc25hcC16b29tLWVuZFxyXG4gICAgICogQGZpcmVzIHNuYXAtem9vbS1yZW1vdmVcclxuICAgICAqIEBmaXJlcyBib3VuY2UteC1zdGFydFxyXG4gICAgICogQGZpcmVzIGJvdW5jZS14LWVuZFxyXG4gICAgICogQGZpcmVzIGJvdW5jZS15LXN0YXJ0XHJcbiAgICAgKiBAZmlyZXMgYm91bmNlLXktZW5kXHJcbiAgICAgKiBAZmlyZXMgYm91bmNlLXJlbW92ZVxyXG4gICAgICogQGZpcmVzIHdoZWVsXHJcbiAgICAgKiBAZmlyZXMgd2hlZWwtcmVtb3ZlXHJcbiAgICAgKiBAZmlyZXMgd2hlZWwtc2Nyb2xsXHJcbiAgICAgKiBAZmlyZXMgd2hlZWwtc2Nyb2xsLXJlbW92ZVxyXG4gICAgICogQGZpcmVzIG1vdXNlLWVkZ2Utc3RhcnRcclxuICAgICAqIEBmaXJlcyBtb3VzZS1lZGdlLWVuZFxyXG4gICAgICogQGZpcmVzIG1vdXNlLWVkZ2UtcmVtb3ZlXHJcbiAgICAgKiBAZmlyZXMgbW92ZWRcclxuICAgICAqIEBmaXJlcyBtb3ZlZC1lbmRcclxuICAgICAqIEBmaXJlcyB6b29tZWRcclxuICAgICAqIEBmaXJlcyB6b29tZWQtZW5kXHJcbiAgICAgKi9cclxuICAgIGNvbnN0cnVjdG9yKG9wdGlvbnMpXHJcbiAgICB7XHJcbiAgICAgICAgb3B0aW9ucyA9IG9wdGlvbnMgfHwge31cclxuICAgICAgICBzdXBlcigpXHJcbiAgICAgICAgdGhpcy5wbHVnaW5zID0ge31cclxuICAgICAgICB0aGlzLnBsdWdpbnNMaXN0ID0gW11cclxuICAgICAgICB0aGlzLl9zY3JlZW5XaWR0aCA9IG9wdGlvbnMuc2NyZWVuV2lkdGggfHwgd2luZG93LmlubmVyV2lkdGhcclxuICAgICAgICB0aGlzLl9zY3JlZW5IZWlnaHQgPSBvcHRpb25zLnNjcmVlbkhlaWdodCB8fCB3aW5kb3cuaW5uZXJIZWlnaHRcclxuICAgICAgICB0aGlzLl93b3JsZFdpZHRoID0gb3B0aW9ucy53b3JsZFdpZHRoXHJcbiAgICAgICAgdGhpcy5fd29ybGRIZWlnaHQgPSBvcHRpb25zLndvcmxkSGVpZ2h0XHJcbiAgICAgICAgdGhpcy5oaXRBcmVhRnVsbFNjcmVlbiA9IHV0aWxzLmRlZmF1bHRzKG9wdGlvbnMuaGl0QXJlYUZ1bGxTY3JlZW4sIHRydWUpXHJcbiAgICAgICAgdGhpcy5mb3JjZUhpdEFyZWEgPSBvcHRpb25zLmZvcmNlSGl0QXJlYVxyXG4gICAgICAgIHRoaXMucGFzc2l2ZVdoZWVsID0gdXRpbHMuZGVmYXVsdHMob3B0aW9ucy5wYXNzaXZlV2hlZWwsIHRydWUpXHJcbiAgICAgICAgdGhpcy5zdG9wRXZlbnQgPSBvcHRpb25zLnN0b3BQcm9wYWdhdGlvblxyXG4gICAgICAgIHRoaXMudGhyZXNob2xkID0gdXRpbHMuZGVmYXVsdHMob3B0aW9ucy50aHJlc2hvbGQsIDUpXHJcbiAgICAgICAgdGhpcy5pbnRlcmFjdGlvbiA9IG9wdGlvbnMuaW50ZXJhY3Rpb24gfHwgbnVsbFxyXG4gICAgICAgIHRoaXMuZGl2ID0gb3B0aW9ucy5kaXZXaGVlbCB8fCBkb2N1bWVudC5ib2R5XHJcbiAgICAgICAgdGhpcy5saXN0ZW5lcnModGhpcy5kaXYpXHJcbiAgICAgICAgdGhpcy5kaXYub25jb250ZXh0bWVudSA9IGUgPT4gZS5wcmV2ZW50RGVmYXVsdCgpXHJcblxyXG4gICAgICAgIC8qKlxyXG4gICAgICAgICAqIGFjdGl2ZSB0b3VjaCBwb2ludCBpZHMgb24gdGhlIHZpZXdwb3J0XHJcbiAgICAgICAgICogQHR5cGUge251bWJlcltdfVxyXG4gICAgICAgICAqIEByZWFkb25seVxyXG4gICAgICAgICAqL1xyXG4gICAgICAgIHRoaXMudG91Y2hlcyA9IFtdXHJcblxyXG4gICAgICAgIGlmICghb3B0aW9ucy5ub1RpY2tlcilcclxuICAgICAgICB7XHJcbiAgICAgICAgICAgIHRoaXMudGlja2VyID0gb3B0aW9ucy50aWNrZXIgfHwgKFBJWEkuVGlja2VyID8gUElYSS5UaWNrZXIuc2hhcmVkIDogUElYSS50aWNrZXIuc2hhcmVkKVxyXG4gICAgICAgICAgICB0aGlzLnRpY2tlckZ1bmN0aW9uID0gKCkgPT4gdGhpcy51cGRhdGUodGhpcy50aWNrZXIuZWxhcHNlZE1TKVxyXG4gICAgICAgICAgICB0aGlzLnRpY2tlci5hZGQodGhpcy50aWNrZXJGdW5jdGlvbilcclxuICAgICAgICB9XHJcbiAgICB9XHJcblxyXG4gICAgLyoqXHJcbiAgICAgKiByZW1vdmVzIGFsbCBldmVudCBsaXN0ZW5lcnMgZnJvbSB2aWV3cG9ydFxyXG4gICAgICogKHVzZWZ1bCBmb3IgY2xlYW51cCBvZiB3aGVlbCBhbmQgdGlja2VyIGV2ZW50cyB3aGVuIHJlbW92aW5nIHZpZXdwb3J0KVxyXG4gICAgICovXHJcbiAgICByZW1vdmVMaXN0ZW5lcnMoKVxyXG4gICAge1xyXG4gICAgICAgIHRoaXMudGlja2VyLnJlbW92ZSh0aGlzLnRpY2tlckZ1bmN0aW9uKVxyXG4gICAgICAgIHRoaXMuZGl2LnJlbW92ZUV2ZW50TGlzdGVuZXIoJ3doZWVsJywgdGhpcy53aGVlbEZ1bmN0aW9uKVxyXG4gICAgfVxyXG5cclxuICAgIC8qKlxyXG4gICAgICogb3ZlcnJpZGVzIFBJWEkuQ29udGFpbmVyJ3MgZGVzdHJveSB0byBhbHNvIHJlbW92ZSB0aGUgJ3doZWVsJyBhbmQgUElYSS5UaWNrZXIgbGlzdGVuZXJzXHJcbiAgICAgKi9cclxuICAgIGRlc3Ryb3kob3B0aW9ucylcclxuICAgIHtcclxuICAgICAgICBzdXBlci5kZXN0cm95KG9wdGlvbnMpXHJcbiAgICAgICAgdGhpcy5yZW1vdmVMaXN0ZW5lcnMoKVxyXG4gICAgfVxyXG5cclxuICAgIC8qKlxyXG4gICAgICogdXBkYXRlIHZpZXdwb3J0IG9uIGVhY2ggZnJhbWVcclxuICAgICAqIGJ5IGRlZmF1bHQsIHlvdSBkbyBub3QgbmVlZCB0byBjYWxsIHRoaXMgdW5sZXNzIHlvdSBzZXQgb3B0aW9ucy5ub1RpY2tlcj10cnVlXHJcbiAgICAgKi9cclxuICAgIHVwZGF0ZShlbGFwc2VkKVxyXG4gICAge1xyXG4gICAgICAgIGlmICghdGhpcy5wYXVzZSlcclxuICAgICAgICB7XHJcbiAgICAgICAgICAgIGZvciAobGV0IHBsdWdpbiBvZiB0aGlzLnBsdWdpbnNMaXN0KVxyXG4gICAgICAgICAgICB7XHJcbiAgICAgICAgICAgICAgICBwbHVnaW4udXBkYXRlKGVsYXBzZWQpXHJcbiAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgIGlmICh0aGlzLmxhc3RWaWV3cG9ydClcclxuICAgICAgICAgICAge1xyXG4gICAgICAgICAgICAgICAgLy8gY2hlY2sgZm9yIG1vdmVkLWVuZCBldmVudFxyXG4gICAgICAgICAgICAgICAgaWYgKHRoaXMubGFzdFZpZXdwb3J0LnggIT09IHRoaXMueCB8fCB0aGlzLmxhc3RWaWV3cG9ydC55ICE9PSB0aGlzLnkpXHJcbiAgICAgICAgICAgICAgICB7XHJcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5tb3ZpbmcgPSB0cnVlXHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICBlbHNlXHJcbiAgICAgICAgICAgICAgICB7XHJcbiAgICAgICAgICAgICAgICAgICAgaWYgKHRoaXMubW92aW5nKVxyXG4gICAgICAgICAgICAgICAgICAgIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy5lbWl0KCdtb3ZlZC1lbmQnLCB0aGlzKVxyXG4gICAgICAgICAgICAgICAgICAgICAgICB0aGlzLm1vdmluZyA9IGZhbHNlXHJcbiAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgLy8gY2hlY2sgZm9yIHpvb21lZC1lbmQgZXZlbnRcclxuICAgICAgICAgICAgICAgIGlmICh0aGlzLmxhc3RWaWV3cG9ydC5zY2FsZVggIT09IHRoaXMuc2NhbGUueCB8fCB0aGlzLmxhc3RWaWV3cG9ydC5zY2FsZVkgIT09IHRoaXMuc2NhbGUueSlcclxuICAgICAgICAgICAgICAgIHtcclxuICAgICAgICAgICAgICAgICAgICB0aGlzLnpvb21pbmcgPSB0cnVlXHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICBlbHNlXHJcbiAgICAgICAgICAgICAgICB7XHJcbiAgICAgICAgICAgICAgICAgICAgaWYgKHRoaXMuem9vbWluZylcclxuICAgICAgICAgICAgICAgICAgICB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMuZW1pdCgnem9vbWVkLWVuZCcsIHRoaXMpXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMuem9vbWluZyA9IGZhbHNlXHJcbiAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgaWYgKCF0aGlzLmZvcmNlSGl0QXJlYSlcclxuICAgICAgICAgICAge1xyXG4gICAgICAgICAgICAgICAgdGhpcy5oaXRBcmVhLnggPSB0aGlzLmxlZnRcclxuICAgICAgICAgICAgICAgIHRoaXMuaGl0QXJlYS55ID0gdGhpcy50b3BcclxuICAgICAgICAgICAgICAgIHRoaXMuaGl0QXJlYS53aWR0aCA9IHRoaXMud29ybGRTY3JlZW5XaWR0aFxyXG4gICAgICAgICAgICAgICAgdGhpcy5oaXRBcmVhLmhlaWdodCA9IHRoaXMud29ybGRTY3JlZW5IZWlnaHRcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICB0aGlzLl9kaXJ0eSA9IHRoaXMuX2RpcnR5IHx8ICF0aGlzLmxhc3RWaWV3cG9ydCB8fFxyXG4gICAgICAgICAgICAgICAgdGhpcy5sYXN0Vmlld3BvcnQueCAhPT0gdGhpcy54IHx8IHRoaXMubGFzdFZpZXdwb3J0LnkgIT09IHRoaXMueSB8fFxyXG4gICAgICAgICAgICAgICAgdGhpcy5sYXN0Vmlld3BvcnQuc2NhbGVYICE9PSB0aGlzLnNjYWxlLnggfHwgdGhpcy5sYXN0Vmlld3BvcnQuc2NhbGVZICE9PSB0aGlzLnNjYWxlLnlcclxuICAgICAgICAgICAgdGhpcy5sYXN0Vmlld3BvcnQgPSB7XHJcbiAgICAgICAgICAgICAgICB4OiB0aGlzLngsXHJcbiAgICAgICAgICAgICAgICB5OiB0aGlzLnksXHJcbiAgICAgICAgICAgICAgICBzY2FsZVg6IHRoaXMuc2NhbGUueCxcclxuICAgICAgICAgICAgICAgIHNjYWxlWTogdGhpcy5zY2FsZS55XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9XHJcbiAgICB9XHJcblxyXG4gICAgLyoqXHJcbiAgICAgKiB1c2UgdGhpcyB0byBzZXQgc2NyZWVuIGFuZCB3b3JsZCBzaXplcy0tbmVlZGVkIGZvciBwaW5jaC93aGVlbC9jbGFtcC9ib3VuY2VcclxuICAgICAqIEBwYXJhbSB7bnVtYmVyfSBbc2NyZWVuV2lkdGg9d2luZG93LmlubmVyV2lkdGhdXHJcbiAgICAgKiBAcGFyYW0ge251bWJlcn0gW3NjcmVlbkhlaWdodD13aW5kb3cuaW5uZXJIZWlnaHRdXHJcbiAgICAgKiBAcGFyYW0ge251bWJlcn0gW3dvcmxkV2lkdGhdXHJcbiAgICAgKiBAcGFyYW0ge251bWJlcn0gW3dvcmxkSGVpZ2h0XVxyXG4gICAgICovXHJcbiAgICByZXNpemUoc2NyZWVuV2lkdGgsIHNjcmVlbkhlaWdodCwgd29ybGRXaWR0aCwgd29ybGRIZWlnaHQpXHJcbiAgICB7XHJcbiAgICAgICAgdGhpcy5fc2NyZWVuV2lkdGggPSBzY3JlZW5XaWR0aCB8fCB3aW5kb3cuaW5uZXJXaWR0aFxyXG4gICAgICAgIHRoaXMuX3NjcmVlbkhlaWdodCA9IHNjcmVlbkhlaWdodCB8fCB3aW5kb3cuaW5uZXJIZWlnaHRcclxuICAgICAgICBpZiAod29ybGRXaWR0aClcclxuICAgICAgICB7XHJcbiAgICAgICAgICAgIHRoaXMuX3dvcmxkV2lkdGggPSB3b3JsZFdpZHRoXHJcbiAgICAgICAgfVxyXG4gICAgICAgIGlmICh3b3JsZEhlaWdodClcclxuICAgICAgICB7XHJcbiAgICAgICAgICAgIHRoaXMuX3dvcmxkSGVpZ2h0ID0gd29ybGRIZWlnaHRcclxuICAgICAgICB9XHJcbiAgICAgICAgdGhpcy5yZXNpemVQbHVnaW5zKClcclxuICAgIH1cclxuXHJcbiAgICAvKipcclxuICAgICAqIGNhbGxlZCBhZnRlciBhIHdvcmxkV2lkdGgvSGVpZ2h0IGNoYW5nZVxyXG4gICAgICogQHByaXZhdGVcclxuICAgICAqL1xyXG4gICAgcmVzaXplUGx1Z2lucygpXHJcbiAgICB7XHJcbiAgICAgICAgZm9yIChsZXQgcGx1Z2luIG9mIHRoaXMucGx1Z2luc0xpc3QpXHJcbiAgICAgICAge1xyXG4gICAgICAgICAgICBwbHVnaW4ucmVzaXplKClcclxuICAgICAgICB9XHJcbiAgICB9XHJcblxyXG4gICAgLyoqXHJcbiAgICAgKiBzY3JlZW4gd2lkdGggaW4gc2NyZWVuIHBpeGVsc1xyXG4gICAgICogQHR5cGUge251bWJlcn1cclxuICAgICAqL1xyXG4gICAgZ2V0IHNjcmVlbldpZHRoKClcclxuICAgIHtcclxuICAgICAgICByZXR1cm4gdGhpcy5fc2NyZWVuV2lkdGhcclxuICAgIH1cclxuICAgIHNldCBzY3JlZW5XaWR0aCh2YWx1ZSlcclxuICAgIHtcclxuICAgICAgICB0aGlzLl9zY3JlZW5XaWR0aCA9IHZhbHVlXHJcbiAgICB9XHJcblxyXG4gICAgLyoqXHJcbiAgICAgKiBzY3JlZW4gaGVpZ2h0IGluIHNjcmVlbiBwaXhlbHNcclxuICAgICAqIEB0eXBlIHtudW1iZXJ9XHJcbiAgICAgKi9cclxuICAgIGdldCBzY3JlZW5IZWlnaHQoKVxyXG4gICAge1xyXG4gICAgICAgIHJldHVybiB0aGlzLl9zY3JlZW5IZWlnaHRcclxuICAgIH1cclxuICAgIHNldCBzY3JlZW5IZWlnaHQodmFsdWUpXHJcbiAgICB7XHJcbiAgICAgICAgdGhpcy5fc2NyZWVuSGVpZ2h0ID0gdmFsdWVcclxuICAgIH1cclxuXHJcbiAgICAvKipcclxuICAgICAqIHdvcmxkIHdpZHRoIGluIHBpeGVsc1xyXG4gICAgICogQHR5cGUge251bWJlcn1cclxuICAgICAqL1xyXG4gICAgZ2V0IHdvcmxkV2lkdGgoKVxyXG4gICAge1xyXG4gICAgICAgIGlmICh0aGlzLl93b3JsZFdpZHRoKVxyXG4gICAgICAgIHtcclxuICAgICAgICAgICAgcmV0dXJuIHRoaXMuX3dvcmxkV2lkdGhcclxuICAgICAgICB9XHJcbiAgICAgICAgZWxzZVxyXG4gICAgICAgIHtcclxuICAgICAgICAgICAgcmV0dXJuIHRoaXMud2lkdGhcclxuICAgICAgICB9XHJcbiAgICB9XHJcbiAgICBzZXQgd29ybGRXaWR0aCh2YWx1ZSlcclxuICAgIHtcclxuICAgICAgICB0aGlzLl93b3JsZFdpZHRoID0gdmFsdWVcclxuICAgICAgICB0aGlzLnJlc2l6ZVBsdWdpbnMoKVxyXG4gICAgfVxyXG5cclxuICAgIC8qKlxyXG4gICAgICogd29ybGQgaGVpZ2h0IGluIHBpeGVsc1xyXG4gICAgICogQHR5cGUge251bWJlcn1cclxuICAgICAqL1xyXG4gICAgZ2V0IHdvcmxkSGVpZ2h0KClcclxuICAgIHtcclxuICAgICAgICBpZiAodGhpcy5fd29ybGRIZWlnaHQpXHJcbiAgICAgICAge1xyXG4gICAgICAgICAgICByZXR1cm4gdGhpcy5fd29ybGRIZWlnaHRcclxuICAgICAgICB9XHJcbiAgICAgICAgZWxzZVxyXG4gICAgICAgIHtcclxuICAgICAgICAgICAgcmV0dXJuIHRoaXMuaGVpZ2h0XHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG4gICAgc2V0IHdvcmxkSGVpZ2h0KHZhbHVlKVxyXG4gICAge1xyXG4gICAgICAgIHRoaXMuX3dvcmxkSGVpZ2h0ID0gdmFsdWVcclxuICAgICAgICB0aGlzLnJlc2l6ZVBsdWdpbnMoKVxyXG4gICAgfVxyXG5cclxuICAgIC8qKlxyXG4gICAgICogZ2V0IHZpc2libGUgYm91bmRzIG9mIHZpZXdwb3J0XHJcbiAgICAgKiBAcmV0dXJuIHtvYmplY3R9IGJvdW5kcyB7IHgsIHksIHdpZHRoLCBoZWlnaHQgfVxyXG4gICAgICovXHJcbiAgICBnZXRWaXNpYmxlQm91bmRzKClcclxuICAgIHtcclxuICAgICAgICByZXR1cm4geyB4OiB0aGlzLmxlZnQsIHk6IHRoaXMudG9wLCB3aWR0aDogdGhpcy53b3JsZFNjcmVlbldpZHRoLCBoZWlnaHQ6IHRoaXMud29ybGRTY3JlZW5IZWlnaHQgfVxyXG4gICAgfVxyXG5cclxuICAgIC8qKlxyXG4gICAgICogYWRkIGlucHV0IGxpc3RlbmVyc1xyXG4gICAgICogQHByaXZhdGVcclxuICAgICAqL1xyXG4gICAgbGlzdGVuZXJzKGRpdilcclxuICAgIHtcclxuICAgICAgICB0aGlzLmludGVyYWN0aXZlID0gdHJ1ZVxyXG4gICAgICAgIGlmICghdGhpcy5mb3JjZUhpdEFyZWEpXHJcbiAgICAgICAge1xyXG4gICAgICAgICAgICB0aGlzLmhpdEFyZWEgPSBuZXcgUElYSS5SZWN0YW5nbGUoMCwgMCwgdGhpcy53b3JsZFdpZHRoLCB0aGlzLndvcmxkSGVpZ2h0KVxyXG4gICAgICAgIH1cclxuICAgICAgICB0aGlzLm9uKCdwb2ludGVyZG93bicsIHRoaXMuZG93bilcclxuICAgICAgICB0aGlzLm9uKCdwb2ludGVybW92ZScsIHRoaXMubW92ZSlcclxuICAgICAgICB0aGlzLm9uKCdwb2ludGVydXAnLCB0aGlzLnVwKVxyXG4gICAgICAgIHRoaXMub24oJ3BvaW50ZXJ1cG91dHNpZGUnLCB0aGlzLnVwKVxyXG4gICAgICAgIHRoaXMub24oJ3BvaW50ZXJjYW5jZWwnLCB0aGlzLnVwKVxyXG4gICAgICAgIHRoaXMub24oJ3BvaW50ZXJvdXQnLCB0aGlzLnVwKVxyXG4gICAgICAgIHRoaXMud2hlZWxGdW5jdGlvbiA9IChlKSA9PiB0aGlzLmhhbmRsZVdoZWVsKGUpXHJcbiAgICAgICAgZGl2LmFkZEV2ZW50TGlzdGVuZXIoJ3doZWVsJywgdGhpcy53aGVlbEZ1bmN0aW9uLCB7IHBhc3NpdmU6IHRoaXMucGFzc2l2ZVdoZWVsIH0pXHJcbiAgICAgICAgdGhpcy5pc01vdXNlRG93biA9IGZhbHNlXHJcbiAgICB9XHJcblxyXG4gICAgLyoqXHJcbiAgICAgKiBoYW5kbGUgZG93biBldmVudHNcclxuICAgICAqIEBwcml2YXRlXHJcbiAgICAgKi9cclxuICAgIGRvd24oZSlcclxuICAgIHtcclxuICAgICAgICBpZiAodGhpcy5wYXVzZSB8fCAhdGhpcy53b3JsZFZpc2libGUpXHJcbiAgICAgICAge1xyXG4gICAgICAgICAgICByZXR1cm5cclxuICAgICAgICB9XHJcbiAgICAgICAgaWYgKGUuZGF0YS5wb2ludGVyVHlwZSA9PT0gJ21vdXNlJylcclxuICAgICAgICB7XHJcbiAgICAgICAgICAgIHRoaXMuaXNNb3VzZURvd24gPSB0cnVlXHJcbiAgICAgICAgfVxyXG4gICAgICAgIGVsc2VcclxuICAgICAgICB7XHJcbiAgICAgICAgICAgIHRoaXMudG91Y2hlcy5wdXNoKGUuZGF0YS5wb2ludGVySWQpXHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBpZiAodGhpcy5jb3VudERvd25Qb2ludGVycygpID09PSAxKVxyXG4gICAgICAgIHtcclxuICAgICAgICAgICAgdGhpcy5sYXN0ID0gZS5kYXRhLmdsb2JhbC5jbG9uZSgpXHJcblxyXG4gICAgICAgICAgICAvLyBjbGlja2VkIGV2ZW50IGRvZXMgbm90IGZpcmUgaWYgdmlld3BvcnQgaXMgZGVjZWxlcmF0aW5nIG9yIGJvdW5jaW5nXHJcbiAgICAgICAgICAgIGNvbnN0IGRlY2VsZXJhdGUgPSB0aGlzLnBsdWdpbnNbJ2RlY2VsZXJhdGUnXVxyXG4gICAgICAgICAgICBjb25zdCBib3VuY2UgPSB0aGlzLnBsdWdpbnNbJ2JvdW5jZSddXHJcbiAgICAgICAgICAgIGlmICgoIWRlY2VsZXJhdGUgfHwgIWRlY2VsZXJhdGUuaXNBY3RpdmUoKSkgJiYgKCFib3VuY2UgfHwgIWJvdW5jZS5pc0FjdGl2ZSgpKSlcclxuICAgICAgICAgICAge1xyXG4gICAgICAgICAgICAgICAgdGhpcy5jbGlja2VkQXZhaWxhYmxlID0gdHJ1ZVxyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIGVsc2VcclxuICAgICAgICAgICAge1xyXG4gICAgICAgICAgICAgICAgdGhpcy5jbGlja2VkQXZhaWxhYmxlID0gZmFsc2VcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH1cclxuICAgICAgICBlbHNlXHJcbiAgICAgICAge1xyXG4gICAgICAgICAgICB0aGlzLmNsaWNrZWRBdmFpbGFibGUgPSBmYWxzZVxyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgbGV0IHN0b3BcclxuICAgICAgICBmb3IgKGxldCBwbHVnaW4gb2YgdGhpcy5wbHVnaW5zTGlzdClcclxuICAgICAgICB7XHJcbiAgICAgICAgICAgIGlmIChwbHVnaW4uZG93bihlKSlcclxuICAgICAgICAgICAge1xyXG4gICAgICAgICAgICAgICAgc3RvcCA9IHRydWVcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH1cclxuICAgICAgICBpZiAoc3RvcCAmJiB0aGlzLnN0b3BFdmVudClcclxuICAgICAgICB7XHJcbiAgICAgICAgICAgIGUuc3RvcFByb3BhZ2F0aW9uKClcclxuICAgICAgICB9XHJcbiAgICB9XHJcblxyXG4gICAgLyoqXHJcbiAgICAgKiB3aGV0aGVyIGNoYW5nZSBleGNlZWRzIHRocmVzaG9sZFxyXG4gICAgICogQHByaXZhdGVcclxuICAgICAqIEBwYXJhbSB7bnVtYmVyfSBjaGFuZ2VcclxuICAgICAqL1xyXG4gICAgY2hlY2tUaHJlc2hvbGQoY2hhbmdlKVxyXG4gICAge1xyXG4gICAgICAgIGlmIChNYXRoLmFicyhjaGFuZ2UpID49IHRoaXMudGhyZXNob2xkKVxyXG4gICAgICAgIHtcclxuICAgICAgICAgICAgcmV0dXJuIHRydWVcclxuICAgICAgICB9XHJcbiAgICAgICAgcmV0dXJuIGZhbHNlXHJcbiAgICB9XHJcblxyXG4gICAgLyoqXHJcbiAgICAgKiBoYW5kbGUgbW92ZSBldmVudHNcclxuICAgICAqIEBwcml2YXRlXHJcbiAgICAgKi9cclxuICAgIG1vdmUoZSlcclxuICAgIHtcclxuICAgICAgICBpZiAodGhpcy5wYXVzZSB8fCAhdGhpcy53b3JsZFZpc2libGUpXHJcbiAgICAgICAge1xyXG4gICAgICAgICAgICByZXR1cm5cclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIGxldCBzdG9wXHJcbiAgICAgICAgZm9yIChsZXQgcGx1Z2luIG9mIHRoaXMucGx1Z2luc0xpc3QpXHJcbiAgICAgICAge1xyXG4gICAgICAgICAgICBpZiAocGx1Z2luLm1vdmUoZSkpXHJcbiAgICAgICAgICAgIHtcclxuICAgICAgICAgICAgICAgIHN0b3AgPSB0cnVlXHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIGlmICh0aGlzLmNsaWNrZWRBdmFpbGFibGUpXHJcbiAgICAgICAge1xyXG4gICAgICAgICAgICBjb25zdCBkaXN0WCA9IGUuZGF0YS5nbG9iYWwueCAtIHRoaXMubGFzdC54XHJcbiAgICAgICAgICAgIGNvbnN0IGRpc3RZID0gZS5kYXRhLmdsb2JhbC55IC0gdGhpcy5sYXN0LnlcclxuICAgICAgICAgICAgaWYgKHRoaXMuY2hlY2tUaHJlc2hvbGQoZGlzdFgpIHx8IHRoaXMuY2hlY2tUaHJlc2hvbGQoZGlzdFkpKVxyXG4gICAgICAgICAgICB7XHJcbiAgICAgICAgICAgICAgICB0aGlzLmNsaWNrZWRBdmFpbGFibGUgPSBmYWxzZVxyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBpZiAoc3RvcCAmJiB0aGlzLnN0b3BFdmVudClcclxuICAgICAgICB7XHJcbiAgICAgICAgICAgIGUuc3RvcFByb3BhZ2F0aW9uKClcclxuICAgICAgICB9XHJcblxyXG4gICAgfVxyXG5cclxuICAgIC8qKlxyXG4gICAgICogaGFuZGxlIHVwIGV2ZW50c1xyXG4gICAgICogQHByaXZhdGVcclxuICAgICAqL1xyXG4gICAgdXAoZSlcclxuICAgIHtcclxuICAgICAgICBpZiAodGhpcy5wYXVzZSB8fCAhdGhpcy53b3JsZFZpc2libGUpXHJcbiAgICAgICAge1xyXG4gICAgICAgICAgICByZXR1cm5cclxuICAgICAgICB9XHJcbiAgICAgICAgaWYgKGUuZGF0YS5wb2ludGVyVHlwZSA9PT0gJ21vdXNlJylcclxuICAgICAgICB7XHJcbiAgICAgICAgICAgIHRoaXMuaXNNb3VzZURvd24gPSBmYWxzZVxyXG4gICAgICAgIH1cclxuICAgICAgICBpZiAoZS5kYXRhLnBvaW50ZXJUeXBlICE9PSAnbW91c2UnKVxyXG4gICAgICAgIHtcclxuICAgICAgICAgICAgZm9yIChsZXQgaSA9IDA7IGkgPCB0aGlzLnRvdWNoZXMubGVuZ3RoOyBpKyspXHJcbiAgICAgICAgICAgIHtcclxuICAgICAgICAgICAgICAgIGlmICh0aGlzLnRvdWNoZXNbaV0gPT09IGUuZGF0YS5wb2ludGVySWQpXHJcbiAgICAgICAgICAgICAgICB7XHJcbiAgICAgICAgICAgICAgICAgICAgdGhpcy50b3VjaGVzLnNwbGljZShpLCAxKVxyXG4gICAgICAgICAgICAgICAgICAgIGJyZWFrXHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIGxldCBzdG9wXHJcbiAgICAgICAgZm9yIChsZXQgcGx1Z2luIG9mIHRoaXMucGx1Z2luc0xpc3QpXHJcbiAgICAgICAge1xyXG4gICAgICAgICAgICBpZiAocGx1Z2luLnVwKGUpKVxyXG4gICAgICAgICAgICB7XHJcbiAgICAgICAgICAgICAgICBzdG9wID0gdHJ1ZVxyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBpZiAodGhpcy5jbGlja2VkQXZhaWxhYmxlICYmIHRoaXMuY291bnREb3duUG9pbnRlcnMoKSA9PT0gMClcclxuICAgICAgICB7XHJcbiAgICAgICAgICAgIHRoaXMuZW1pdCgnY2xpY2tlZCcsIHsgc2NyZWVuOiB0aGlzLmxhc3QsIHdvcmxkOiB0aGlzLnRvV29ybGQodGhpcy5sYXN0KSwgdmlld3BvcnQ6IHRoaXMgfSlcclxuICAgICAgICAgICAgdGhpcy5jbGlja2VkQXZhaWxhYmxlID0gZmFsc2VcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIGlmIChzdG9wICYmIHRoaXMuc3RvcEV2ZW50KVxyXG4gICAgICAgIHtcclxuICAgICAgICAgICAgZS5zdG9wUHJvcGFnYXRpb24oKVxyXG4gICAgICAgIH1cclxuICAgIH1cclxuXHJcbiAgICAvKipcclxuICAgICAqIGdldHMgcG9pbnRlciBwb3NpdGlvbiBpZiB0aGlzLmludGVyYWN0aW9uIGlzIHNldFxyXG4gICAgICogQHBhcmFtIHtVSUV2ZW50fSBldnRcclxuICAgICAqIEBwcml2YXRlXHJcbiAgICAgKi9cclxuICAgIGdldFBvaW50ZXJQb3NpdGlvbihldnQpXHJcbiAgICB7XHJcbiAgICAgICAgbGV0IHBvaW50ID0gbmV3IFBJWEkuUG9pbnQoKVxyXG4gICAgICAgIGlmICh0aGlzLmludGVyYWN0aW9uKVxyXG4gICAgICAgIHtcclxuICAgICAgICAgICAgdGhpcy5pbnRlcmFjdGlvbi5tYXBQb3NpdGlvblRvUG9pbnQocG9pbnQsIGV2dC5jbGllbnRYLCBldnQuY2xpZW50WSlcclxuICAgICAgICB9XHJcbiAgICAgICAgZWxzZVxyXG4gICAgICAgIHtcclxuICAgICAgICAgICAgcG9pbnQueCA9IGV2dC5jbGllbnRYXHJcbiAgICAgICAgICAgIHBvaW50LnkgPSBldnQuY2xpZW50WVxyXG4gICAgICAgIH1cclxuICAgICAgICByZXR1cm4gcG9pbnRcclxuICAgIH1cclxuXHJcbiAgICAvKipcclxuICAgICAqIGhhbmRsZSB3aGVlbCBldmVudHNcclxuICAgICAqIEBwcml2YXRlXHJcbiAgICAgKi9cclxuICAgIGhhbmRsZVdoZWVsKGUpXHJcbiAgICB7XHJcbiAgICAgICAgaWYgKHRoaXMucGF1c2UgfHwgIXRoaXMud29ybGRWaXNpYmxlKVxyXG4gICAgICAgIHtcclxuICAgICAgICAgICAgcmV0dXJuXHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICAvLyBvbmx5IGhhbmRsZSB3aGVlbCBldmVudHMgd2hlcmUgdGhlIG1vdXNlIGlzIG92ZXIgdGhlIHZpZXdwb3J0XHJcbiAgICAgICAgY29uc3QgcG9pbnQgPSB0aGlzLnRvTG9jYWwodGhpcy5nZXRQb2ludGVyUG9zaXRpb24oZSkpXHJcbiAgICAgICAgaWYgKHRoaXMubGVmdCA8PSBwb2ludC54ICYmIHBvaW50LnggPD0gdGhpcy5yaWdodCAmJiB0aGlzLnRvcCA8PSBwb2ludC55ICYmIHBvaW50LnkgPD0gdGhpcy5ib3R0b20pXHJcbiAgICAgICAge1xyXG4gICAgICAgICAgICBsZXQgcmVzdWx0XHJcbiAgICAgICAgICAgIGZvciAobGV0IHBsdWdpbiBvZiB0aGlzLnBsdWdpbnNMaXN0KVxyXG4gICAgICAgICAgICB7XHJcbiAgICAgICAgICAgICAgICBpZiAocGx1Z2luLndoZWVsKGUpKVxyXG4gICAgICAgICAgICAgICAge1xyXG4gICAgICAgICAgICAgICAgICAgIHJlc3VsdCA9IHRydWVcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICByZXR1cm4gcmVzdWx0XHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG5cclxuICAgIC8qKlxyXG4gICAgICogY2hhbmdlIGNvb3JkaW5hdGVzIGZyb20gc2NyZWVuIHRvIHdvcmxkXHJcbiAgICAgKiBAcGFyYW0ge251bWJlcnxQSVhJLlBvaW50fSB4XHJcbiAgICAgKiBAcGFyYW0ge251bWJlcn0gW3ldXHJcbiAgICAgKiBAcmV0dXJucyB7UElYSS5Qb2ludH1cclxuICAgICAqL1xyXG4gICAgdG9Xb3JsZCgpXHJcbiAgICB7XHJcbiAgICAgICAgaWYgKGFyZ3VtZW50cy5sZW5ndGggPT09IDIpXHJcbiAgICAgICAge1xyXG4gICAgICAgICAgICBjb25zdCB4ID0gYXJndW1lbnRzWzBdXHJcbiAgICAgICAgICAgIGNvbnN0IHkgPSBhcmd1bWVudHNbMV1cclxuICAgICAgICAgICAgcmV0dXJuIHRoaXMudG9Mb2NhbCh7IHgsIHkgfSlcclxuICAgICAgICB9XHJcbiAgICAgICAgZWxzZVxyXG4gICAgICAgIHtcclxuICAgICAgICAgICAgcmV0dXJuIHRoaXMudG9Mb2NhbChhcmd1bWVudHNbMF0pXHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG5cclxuICAgIC8qKlxyXG4gICAgICogY2hhbmdlIGNvb3JkaW5hdGVzIGZyb20gd29ybGQgdG8gc2NyZWVuXHJcbiAgICAgKiBAcGFyYW0ge251bWJlcnxQSVhJLlBvaW50fSB4XHJcbiAgICAgKiBAcGFyYW0ge251bWJlcn0gW3ldXHJcbiAgICAgKiBAcmV0dXJucyB7UElYSS5Qb2ludH1cclxuICAgICAqL1xyXG4gICAgdG9TY3JlZW4oKVxyXG4gICAge1xyXG4gICAgICAgIGlmIChhcmd1bWVudHMubGVuZ3RoID09PSAyKVxyXG4gICAgICAgIHtcclxuICAgICAgICAgICAgY29uc3QgeCA9IGFyZ3VtZW50c1swXVxyXG4gICAgICAgICAgICBjb25zdCB5ID0gYXJndW1lbnRzWzFdXHJcbiAgICAgICAgICAgIHJldHVybiB0aGlzLnRvR2xvYmFsKHsgeCwgeSB9KVxyXG4gICAgICAgIH1cclxuICAgICAgICBlbHNlXHJcbiAgICAgICAge1xyXG4gICAgICAgICAgICBjb25zdCBwb2ludCA9IGFyZ3VtZW50c1swXVxyXG4gICAgICAgICAgICByZXR1cm4gdGhpcy50b0dsb2JhbChwb2ludClcclxuICAgICAgICB9XHJcbiAgICB9XHJcblxyXG4gICAgLyoqXHJcbiAgICAgKiBzY3JlZW4gd2lkdGggaW4gd29ybGQgY29vcmRpbmF0ZXNcclxuICAgICAqIEB0eXBlIHtudW1iZXJ9XHJcbiAgICAgKiBAcmVhZG9ubHlcclxuICAgICAqL1xyXG4gICAgZ2V0IHdvcmxkU2NyZWVuV2lkdGgoKVxyXG4gICAge1xyXG4gICAgICAgIHJldHVybiB0aGlzLnNjcmVlbldpZHRoIC8gdGhpcy5zY2FsZS54XHJcbiAgICB9XHJcblxyXG4gICAgLyoqXHJcbiAgICAgKiBzY3JlZW4gaGVpZ2h0IGluIHdvcmxkIGNvb3JkaW5hdGVzXHJcbiAgICAgKiBAdHlwZSB7bnVtYmVyfVxyXG4gICAgICogQHJlYWRvbmx5XHJcbiAgICAgKi9cclxuICAgIGdldCB3b3JsZFNjcmVlbkhlaWdodCgpXHJcbiAgICB7XHJcbiAgICAgICAgcmV0dXJuIHRoaXMuc2NyZWVuSGVpZ2h0IC8gdGhpcy5zY2FsZS55XHJcbiAgICB9XHJcblxyXG4gICAgLyoqXHJcbiAgICAgKiB3b3JsZCB3aWR0aCBpbiBzY3JlZW4gY29vcmRpbmF0ZXNcclxuICAgICAqIEB0eXBlIHtudW1iZXJ9XHJcbiAgICAgKiBAcmVhZG9ubHlcclxuICAgICAqL1xyXG4gICAgZ2V0IHNjcmVlbldvcmxkV2lkdGgoKVxyXG4gICAge1xyXG4gICAgICAgIHJldHVybiB0aGlzLndvcmxkV2lkdGggKiB0aGlzLnNjYWxlLnhcclxuICAgIH1cclxuXHJcbiAgICAvKipcclxuICAgICAqIHdvcmxkIGhlaWdodCBpbiBzY3JlZW4gY29vcmRpbmF0ZXNcclxuICAgICAqIEB0eXBlIHtudW1iZXJ9XHJcbiAgICAgKiBAcmVhZG9ubHlcclxuICAgICAqL1xyXG4gICAgZ2V0IHNjcmVlbldvcmxkSGVpZ2h0KClcclxuICAgIHtcclxuICAgICAgICByZXR1cm4gdGhpcy53b3JsZEhlaWdodCAqIHRoaXMuc2NhbGUueVxyXG4gICAgfVxyXG5cclxuICAgIC8qKlxyXG4gICAgICogZ2V0IGNlbnRlciBvZiBzY3JlZW4gaW4gd29ybGQgY29vcmRpbmF0ZXNcclxuICAgICAqIEB0eXBlIHtQSVhJLlBvaW50fVxyXG4gICAgICovXHJcbiAgICBnZXQgY2VudGVyKClcclxuICAgIHtcclxuICAgICAgICByZXR1cm4gbmV3IFBJWEkuUG9pbnQodGhpcy53b3JsZFNjcmVlbldpZHRoIC8gMiAtIHRoaXMueCAvIHRoaXMuc2NhbGUueCwgdGhpcy53b3JsZFNjcmVlbkhlaWdodCAvIDIgLSB0aGlzLnkgLyB0aGlzLnNjYWxlLnkpXHJcbiAgICB9XHJcbiAgICBzZXQgY2VudGVyKHZhbHVlKVxyXG4gICAge1xyXG4gICAgICAgIHRoaXMubW92ZUNlbnRlcih2YWx1ZSlcclxuICAgIH1cclxuXHJcbiAgICAvKipcclxuICAgICAqIG1vdmUgY2VudGVyIG9mIHZpZXdwb3J0IHRvIHBvaW50XHJcbiAgICAgKiBAcGFyYW0geyhudW1iZXJ8UElYSS5Qb2ludCl9IHggb3IgcG9pbnRcclxuICAgICAqIEBwYXJhbSB7bnVtYmVyfSBbeV1cclxuICAgICAqIEByZXR1cm4ge1ZpZXdwb3J0fSB0aGlzXHJcbiAgICAgKi9cclxuICAgIG1vdmVDZW50ZXIoLyp4LCB5IHwgUElYSS5Qb2ludCovKVxyXG4gICAge1xyXG4gICAgICAgIGxldCB4LCB5XHJcbiAgICAgICAgaWYgKCFpc05hTihhcmd1bWVudHNbMF0pKVxyXG4gICAgICAgIHtcclxuICAgICAgICAgICAgeCA9IGFyZ3VtZW50c1swXVxyXG4gICAgICAgICAgICB5ID0gYXJndW1lbnRzWzFdXHJcbiAgICAgICAgfVxyXG4gICAgICAgIGVsc2VcclxuICAgICAgICB7XHJcbiAgICAgICAgICAgIHggPSBhcmd1bWVudHNbMF0ueFxyXG4gICAgICAgICAgICB5ID0gYXJndW1lbnRzWzBdLnlcclxuICAgICAgICB9XHJcbiAgICAgICAgdGhpcy5wb3NpdGlvbi5zZXQoKHRoaXMud29ybGRTY3JlZW5XaWR0aCAvIDIgLSB4KSAqIHRoaXMuc2NhbGUueCwgKHRoaXMud29ybGRTY3JlZW5IZWlnaHQgLyAyIC0geSkgKiB0aGlzLnNjYWxlLnkpXHJcbiAgICAgICAgdGhpcy5fcmVzZXQoKVxyXG4gICAgICAgIHJldHVybiB0aGlzXHJcbiAgICB9XHJcblxyXG4gICAgLyoqXHJcbiAgICAgKiB0b3AtbGVmdCBjb3JuZXJcclxuICAgICAqIEB0eXBlIHtQSVhJLlBvaW50fVxyXG4gICAgICovXHJcbiAgICBnZXQgY29ybmVyKClcclxuICAgIHtcclxuICAgICAgICByZXR1cm4gbmV3IFBJWEkuUG9pbnQoLXRoaXMueCAvIHRoaXMuc2NhbGUueCwgLXRoaXMueSAvIHRoaXMuc2NhbGUueSlcclxuICAgIH1cclxuICAgIHNldCBjb3JuZXIodmFsdWUpXHJcbiAgICB7XHJcbiAgICAgICAgdGhpcy5tb3ZlQ29ybmVyKHZhbHVlKVxyXG4gICAgfVxyXG5cclxuICAgIC8qKlxyXG4gICAgICogbW92ZSB2aWV3cG9ydCdzIHRvcC1sZWZ0IGNvcm5lcjsgYWxzbyBjbGFtcHMgYW5kIHJlc2V0cyBkZWNlbGVyYXRlIGFuZCBib3VuY2UgKGFzIG5lZWRlZClcclxuICAgICAqIEBwYXJhbSB7bnVtYmVyfFBJWEkuUG9pbnR9IHh8cG9pbnRcclxuICAgICAqIEBwYXJhbSB7bnVtYmVyfSB5XHJcbiAgICAgKiBAcmV0dXJuIHtWaWV3cG9ydH0gdGhpc1xyXG4gICAgICovXHJcbiAgICBtb3ZlQ29ybmVyKC8qeCwgeSB8IHBvaW50Ki8pXHJcbiAgICB7XHJcbiAgICAgICAgaWYgKGFyZ3VtZW50cy5sZW5ndGggPT09IDEpXHJcbiAgICAgICAge1xyXG4gICAgICAgICAgICB0aGlzLnBvc2l0aW9uLnNldCgtYXJndW1lbnRzWzBdLnggKiB0aGlzLnNjYWxlLngsIC1hcmd1bWVudHNbMF0ueSAqIHRoaXMuc2NhbGUueSlcclxuICAgICAgICB9XHJcbiAgICAgICAgZWxzZVxyXG4gICAgICAgIHtcclxuICAgICAgICAgICAgdGhpcy5wb3NpdGlvbi5zZXQoLWFyZ3VtZW50c1swXSAqIHRoaXMuc2NhbGUueCwgLWFyZ3VtZW50c1sxXSAqIHRoaXMuc2NhbGUueSlcclxuICAgICAgICB9XHJcbiAgICAgICAgdGhpcy5fcmVzZXQoKVxyXG4gICAgICAgIHJldHVybiB0aGlzXHJcbiAgICB9XHJcblxyXG4gICAgLyoqXHJcbiAgICAgKiBjaGFuZ2Ugem9vbSBzbyB0aGUgd2lkdGggZml0cyBpbiB0aGUgdmlld3BvcnRcclxuICAgICAqIEBwYXJhbSB7bnVtYmVyfSBbd2lkdGg9dGhpcy5fd29ybGRXaWR0aF0gaW4gd29ybGQgY29vcmRpbmF0ZXNcclxuICAgICAqIEBwYXJhbSB7Ym9vbGVhbn0gW2NlbnRlcl0gbWFpbnRhaW4gdGhlIHNhbWUgY2VudGVyXHJcbiAgICAgKiBAcGFyYW0ge2Jvb2xlYW59IFtzY2FsZVk9dHJ1ZV0gd2hldGhlciB0byBzZXQgc2NhbGVZPXNjYWxlWFxyXG4gICAgICogQHBhcmFtIHtib29sZWFufSBbbm9DbGFtcD1mYWxzZV0gd2hldGhlciB0byBkaXNhYmxlIGNsYW1wLXpvb21cclxuICAgICAqIEByZXR1cm4ge1ZpZXdwb3J0fSB0aGlzXHJcbiAgICAgKi9cclxuICAgIGZpdFdpZHRoKHdpZHRoLCBjZW50ZXIsIHNjYWxlWT10cnVlLCBub0NsYW1wKVxyXG4gICAge1xyXG4gICAgICAgIGxldCBzYXZlXHJcbiAgICAgICAgaWYgKGNlbnRlcilcclxuICAgICAgICB7XHJcbiAgICAgICAgICAgIHNhdmUgPSB0aGlzLmNlbnRlclxyXG4gICAgICAgIH1cclxuICAgICAgICB3aWR0aCA9IHdpZHRoIHx8IHRoaXMud29ybGRXaWR0aFxyXG4gICAgICAgIHRoaXMuc2NhbGUueCA9IHRoaXMuc2NyZWVuV2lkdGggLyB3aWR0aFxyXG5cclxuICAgICAgICBpZiAoc2NhbGVZKVxyXG4gICAgICAgIHtcclxuICAgICAgICAgICAgdGhpcy5zY2FsZS55ID0gdGhpcy5zY2FsZS54XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBjb25zdCBjbGFtcFpvb20gPSB0aGlzLnBsdWdpbnNbJ2NsYW1wLXpvb20nXVxyXG4gICAgICAgIGlmICghbm9DbGFtcCAmJiBjbGFtcFpvb20pXHJcbiAgICAgICAge1xyXG4gICAgICAgICAgICBjbGFtcFpvb20uY2xhbXAoKVxyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgaWYgKGNlbnRlcilcclxuICAgICAgICB7XHJcbiAgICAgICAgICAgIHRoaXMubW92ZUNlbnRlcihzYXZlKVxyXG4gICAgICAgIH1cclxuICAgICAgICByZXR1cm4gdGhpc1xyXG4gICAgfVxyXG5cclxuICAgIC8qKlxyXG4gICAgICogY2hhbmdlIHpvb20gc28gdGhlIGhlaWdodCBmaXRzIGluIHRoZSB2aWV3cG9ydFxyXG4gICAgICogQHBhcmFtIHtudW1iZXJ9IFtoZWlnaHQ9dGhpcy5fd29ybGRIZWlnaHRdIGluIHdvcmxkIGNvb3JkaW5hdGVzXHJcbiAgICAgKiBAcGFyYW0ge2Jvb2xlYW59IFtjZW50ZXJdIG1haW50YWluIHRoZSBzYW1lIGNlbnRlciBvZiB0aGUgc2NyZWVuIGFmdGVyIHpvb21cclxuICAgICAqIEBwYXJhbSB7Ym9vbGVhbn0gW3NjYWxlWD10cnVlXSB3aGV0aGVyIHRvIHNldCBzY2FsZVggPSBzY2FsZVlcclxuICAgICAqIEBwYXJhbSB7Ym9vbGVhbn0gW25vQ2xhbXA9ZmFsc2VdIHdoZXRoZXIgdG8gZGlzYWJsZSBjbGFtcC16b29tXHJcbiAgICAgKiBAcmV0dXJuIHtWaWV3cG9ydH0gdGhpc1xyXG4gICAgICovXHJcbiAgICBmaXRIZWlnaHQoaGVpZ2h0LCBjZW50ZXIsIHNjYWxlWD10cnVlLCBub0NsYW1wKVxyXG4gICAge1xyXG4gICAgICAgIGxldCBzYXZlXHJcbiAgICAgICAgaWYgKGNlbnRlcilcclxuICAgICAgICB7XHJcbiAgICAgICAgICAgIHNhdmUgPSB0aGlzLmNlbnRlclxyXG4gICAgICAgIH1cclxuICAgICAgICBoZWlnaHQgPSBoZWlnaHQgfHwgdGhpcy53b3JsZEhlaWdodFxyXG4gICAgICAgIHRoaXMuc2NhbGUueSA9IHRoaXMuc2NyZWVuSGVpZ2h0IC8gaGVpZ2h0XHJcblxyXG4gICAgICAgIGlmIChzY2FsZVgpXHJcbiAgICAgICAge1xyXG4gICAgICAgICAgICB0aGlzLnNjYWxlLnggPSB0aGlzLnNjYWxlLnlcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIGNvbnN0IGNsYW1wWm9vbSA9IHRoaXMucGx1Z2luc1snY2xhbXAtem9vbSddXHJcbiAgICAgICAgaWYgKCFub0NsYW1wICYmIGNsYW1wWm9vbSlcclxuICAgICAgICB7XHJcbiAgICAgICAgICAgIGNsYW1wWm9vbS5jbGFtcCgpXHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBpZiAoY2VudGVyKVxyXG4gICAgICAgIHtcclxuICAgICAgICAgICAgdGhpcy5tb3ZlQ2VudGVyKHNhdmUpXHJcbiAgICAgICAgfVxyXG4gICAgICAgIHJldHVybiB0aGlzXHJcbiAgICB9XHJcblxyXG4gICAgLyoqXHJcbiAgICAgKiBjaGFuZ2Ugem9vbSBzbyBpdCBmaXRzIHRoZSBlbnRpcmUgd29ybGQgaW4gdGhlIHZpZXdwb3J0XHJcbiAgICAgKiBAcGFyYW0ge2Jvb2xlYW59IFtjZW50ZXJdIG1haW50YWluIHRoZSBzYW1lIGNlbnRlciBvZiB0aGUgc2NyZWVuIGFmdGVyIHpvb21cclxuICAgICAqIEByZXR1cm4ge1ZpZXdwb3J0fSB0aGlzXHJcbiAgICAgKi9cclxuICAgIGZpdFdvcmxkKGNlbnRlcilcclxuICAgIHtcclxuICAgICAgICBsZXQgc2F2ZVxyXG4gICAgICAgIGlmIChjZW50ZXIpXHJcbiAgICAgICAge1xyXG4gICAgICAgICAgICBzYXZlID0gdGhpcy5jZW50ZXJcclxuICAgICAgICB9XHJcbiAgICAgICAgdGhpcy5zY2FsZS54ID0gdGhpcy5zY3JlZW5XaWR0aCAvIHRoaXMud29ybGRXaWR0aFxyXG4gICAgICAgIHRoaXMuc2NhbGUueSA9IHRoaXMuc2NyZWVuSGVpZ2h0IC8gdGhpcy53b3JsZEhlaWdodFxyXG4gICAgICAgIGlmICh0aGlzLnNjYWxlLnggPCB0aGlzLnNjYWxlLnkpXHJcbiAgICAgICAge1xyXG4gICAgICAgICAgICB0aGlzLnNjYWxlLnkgPSB0aGlzLnNjYWxlLnhcclxuICAgICAgICB9XHJcbiAgICAgICAgZWxzZVxyXG4gICAgICAgIHtcclxuICAgICAgICAgICAgdGhpcy5zY2FsZS54ID0gdGhpcy5zY2FsZS55XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBjb25zdCBjbGFtcFpvb20gPSB0aGlzLnBsdWdpbnNbJ2NsYW1wLXpvb20nXVxyXG4gICAgICAgIGlmIChjbGFtcFpvb20pXHJcbiAgICAgICAge1xyXG4gICAgICAgICAgICBjbGFtcFpvb20uY2xhbXAoKVxyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgaWYgKGNlbnRlcilcclxuICAgICAgICB7XHJcbiAgICAgICAgICAgIHRoaXMubW92ZUNlbnRlcihzYXZlKVxyXG4gICAgICAgIH1cclxuICAgICAgICByZXR1cm4gdGhpc1xyXG4gICAgfVxyXG5cclxuICAgIC8qKlxyXG4gICAgICogY2hhbmdlIHpvb20gc28gaXQgZml0cyB0aGUgc2l6ZSBvciB0aGUgZW50aXJlIHdvcmxkIGluIHRoZSB2aWV3cG9ydFxyXG4gICAgICogQHBhcmFtIHtib29sZWFufSBbY2VudGVyXSBtYWludGFpbiB0aGUgc2FtZSBjZW50ZXIgb2YgdGhlIHNjcmVlbiBhZnRlciB6b29tXHJcbiAgICAgKiBAcGFyYW0ge251bWJlcn0gW3dpZHRoXSBkZXNpcmVkIHdpZHRoXHJcbiAgICAgKiBAcGFyYW0ge251bWJlcn0gW2hlaWdodF0gZGVzaXJlZCBoZWlnaHRcclxuICAgICAqIEByZXR1cm4ge1ZpZXdwb3J0fSB0aGlzXHJcbiAgICAgKi9cclxuICAgIGZpdChjZW50ZXIsIHdpZHRoLCBoZWlnaHQpXHJcbiAgICB7XHJcbiAgICAgICAgbGV0IHNhdmVcclxuICAgICAgICBpZiAoY2VudGVyKVxyXG4gICAgICAgIHtcclxuICAgICAgICAgICAgc2F2ZSA9IHRoaXMuY2VudGVyXHJcbiAgICAgICAgfVxyXG4gICAgICAgIHdpZHRoID0gd2lkdGggfHwgdGhpcy53b3JsZFdpZHRoXHJcbiAgICAgICAgaGVpZ2h0ID0gaGVpZ2h0IHx8IHRoaXMud29ybGRIZWlnaHRcclxuICAgICAgICB0aGlzLnNjYWxlLnggPSB0aGlzLnNjcmVlbldpZHRoIC8gd2lkdGhcclxuICAgICAgICB0aGlzLnNjYWxlLnkgPSB0aGlzLnNjcmVlbkhlaWdodCAvIGhlaWdodFxyXG4gICAgICAgIGlmICh0aGlzLnNjYWxlLnggPCB0aGlzLnNjYWxlLnkpXHJcbiAgICAgICAge1xyXG4gICAgICAgICAgICB0aGlzLnNjYWxlLnkgPSB0aGlzLnNjYWxlLnhcclxuICAgICAgICB9XHJcbiAgICAgICAgZWxzZVxyXG4gICAgICAgIHtcclxuICAgICAgICAgICAgdGhpcy5zY2FsZS54ID0gdGhpcy5zY2FsZS55XHJcbiAgICAgICAgfVxyXG4gICAgICAgIGNvbnN0IGNsYW1wWm9vbSA9IHRoaXMucGx1Z2luc1snY2xhbXAtem9vbSddXHJcbiAgICAgICAgaWYgKGNsYW1wWm9vbSlcclxuICAgICAgICB7XHJcbiAgICAgICAgICAgIGNsYW1wWm9vbS5jbGFtcCgpXHJcbiAgICAgICAgfVxyXG4gICAgICAgIGlmIChjZW50ZXIpXHJcbiAgICAgICAge1xyXG4gICAgICAgICAgICB0aGlzLm1vdmVDZW50ZXIoc2F2ZSlcclxuICAgICAgICB9XHJcbiAgICAgICAgcmV0dXJuIHRoaXNcclxuICAgIH1cclxuXHJcbiAgICAvKipcclxuICAgICAqIHpvb20gdmlld3BvcnQgYnkgYSBjZXJ0YWluIHBlcmNlbnQgKGluIGJvdGggeCBhbmQgeSBkaXJlY3Rpb24pXHJcbiAgICAgKiBAcGFyYW0ge251bWJlcn0gcGVyY2VudCBjaGFuZ2UgKGUuZy4sIDAuMjUgd291bGQgaW5jcmVhc2UgYSBzdGFydGluZyBzY2FsZSBvZiAxLjAgdG8gMS4yNSlcclxuICAgICAqIEBwYXJhbSB7Ym9vbGVhbn0gW2NlbnRlcl0gbWFpbnRhaW4gdGhlIHNhbWUgY2VudGVyIG9mIHRoZSBzY3JlZW4gYWZ0ZXIgem9vbVxyXG4gICAgICogQHJldHVybiB7Vmlld3BvcnR9IHRoZSB2aWV3cG9ydFxyXG4gICAgICovXHJcbiAgICB6b29tUGVyY2VudChwZXJjZW50LCBjZW50ZXIpXHJcbiAgICB7XHJcbiAgICAgICAgbGV0IHNhdmVcclxuICAgICAgICBpZiAoY2VudGVyKVxyXG4gICAgICAgIHtcclxuICAgICAgICAgICAgc2F2ZSA9IHRoaXMuY2VudGVyXHJcbiAgICAgICAgfVxyXG4gICAgICAgIGNvbnN0IHNjYWxlID0gdGhpcy5zY2FsZS54ICsgdGhpcy5zY2FsZS54ICogcGVyY2VudFxyXG4gICAgICAgIHRoaXMuc2NhbGUuc2V0KHNjYWxlKVxyXG4gICAgICAgIGNvbnN0IGNsYW1wWm9vbSA9IHRoaXMucGx1Z2luc1snY2xhbXAtem9vbSddXHJcbiAgICAgICAgaWYgKGNsYW1wWm9vbSlcclxuICAgICAgICB7XHJcbiAgICAgICAgICAgIGNsYW1wWm9vbS5jbGFtcCgpXHJcbiAgICAgICAgfVxyXG4gICAgICAgIGlmIChjZW50ZXIpXHJcbiAgICAgICAge1xyXG4gICAgICAgICAgICB0aGlzLm1vdmVDZW50ZXIoc2F2ZSlcclxuICAgICAgICB9XHJcbiAgICAgICAgcmV0dXJuIHRoaXNcclxuICAgIH1cclxuXHJcbiAgICAvKipcclxuICAgICAqIHpvb20gdmlld3BvcnQgYnkgaW5jcmVhc2luZy9kZWNyZWFzaW5nIHdpZHRoIGJ5IGEgY2VydGFpbiBudW1iZXIgb2YgcGl4ZWxzXHJcbiAgICAgKiBAcGFyYW0ge251bWJlcn0gY2hhbmdlIGluIHBpeGVsc1xyXG4gICAgICogQHBhcmFtIHtib29sZWFufSBbY2VudGVyXSBtYWludGFpbiB0aGUgc2FtZSBjZW50ZXIgb2YgdGhlIHNjcmVlbiBhZnRlciB6b29tXHJcbiAgICAgKiBAcmV0dXJuIHtWaWV3cG9ydH0gdGhlIHZpZXdwb3J0XHJcbiAgICAgKi9cclxuICAgIHpvb20oY2hhbmdlLCBjZW50ZXIpXHJcbiAgICB7XHJcbiAgICAgICAgdGhpcy5maXRXaWR0aChjaGFuZ2UgKyB0aGlzLndvcmxkU2NyZWVuV2lkdGgsIGNlbnRlcilcclxuICAgICAgICByZXR1cm4gdGhpc1xyXG4gICAgfVxyXG5cclxuICAgIC8qKlxyXG4gICAgICogQHBhcmFtIHtvYmplY3R9IFtvcHRpb25zXVxyXG4gICAgICogQHBhcmFtIHtudW1iZXJ9IFtvcHRpb25zLndpZHRoXSB0aGUgZGVzaXJlZCB3aWR0aCB0byBzbmFwICh0byBtYWludGFpbiBhc3BlY3QgcmF0aW8sIGNob29zZSBvbmx5IHdpZHRoIG9yIGhlaWdodClcclxuICAgICAqIEBwYXJhbSB7bnVtYmVyfSBbb3B0aW9ucy5oZWlnaHRdIHRoZSBkZXNpcmVkIGhlaWdodCB0byBzbmFwICh0byBtYWludGFpbiBhc3BlY3QgcmF0aW8sIGNob29zZSBvbmx5IHdpZHRoIG9yIGhlaWdodClcclxuICAgICAqIEBwYXJhbSB7bnVtYmVyfSBbb3B0aW9ucy50aW1lPTEwMDBdXHJcbiAgICAgKiBAcGFyYW0ge3N0cmluZ3xmdW5jdGlvbn0gW29wdGlvbnMuZWFzZT1lYXNlSW5PdXRTaW5lXSBlYXNlIGZ1bmN0aW9uIG9yIG5hbWUgKHNlZSBodHRwOi8vZWFzaW5ncy5uZXQvIGZvciBzdXBwb3J0ZWQgbmFtZXMpXHJcbiAgICAgKiBAcGFyYW0ge1BJWEkuUG9pbnR9IFtvcHRpb25zLmNlbnRlcl0gcGxhY2UgdGhpcyBwb2ludCBhdCBjZW50ZXIgZHVyaW5nIHpvb20gaW5zdGVhZCBvZiBjZW50ZXIgb2YgdGhlIHZpZXdwb3J0XHJcbiAgICAgKiBAcGFyYW0ge2Jvb2xlYW59IFtvcHRpb25zLmludGVycnVwdD10cnVlXSBwYXVzZSBzbmFwcGluZyB3aXRoIGFueSB1c2VyIGlucHV0IG9uIHRoZSB2aWV3cG9ydFxyXG4gICAgICogQHBhcmFtIHtib29sZWFufSBbb3B0aW9ucy5yZW1vdmVPbkNvbXBsZXRlXSByZW1vdmVzIHRoaXMgcGx1Z2luIGFmdGVyIHNuYXBwaW5nIGlzIGNvbXBsZXRlXHJcbiAgICAgKiBAcGFyYW0ge2Jvb2xlYW59IFtvcHRpb25zLnJlbW92ZU9uSW50ZXJydXB0XSByZW1vdmVzIHRoaXMgcGx1Z2luIGlmIGludGVycnVwdGVkIGJ5IGFueSB1c2VyIGlucHV0XHJcbiAgICAgKiBAcGFyYW0ge2Jvb2xlYW59IFtvcHRpb25zLmZvcmNlU3RhcnRdIHN0YXJ0cyB0aGUgc25hcCBpbW1lZGlhdGVseSByZWdhcmRsZXNzIG9mIHdoZXRoZXIgdGhlIHZpZXdwb3J0IGlzIGF0IHRoZSBkZXNpcmVkIHpvb21cclxuICAgICAqIEBwYXJhbSB7Ym9vbGVhbn0gW29wdGlvbnMubm9Nb3ZlXSB6b29tIGJ1dCBkbyBub3QgbW92ZVxyXG4gICAgICovXHJcbiAgICBzbmFwWm9vbShvcHRpb25zKVxyXG4gICAge1xyXG4gICAgICAgIHRoaXMucGx1Z2luc1snc25hcC16b29tJ10gPSBuZXcgU25hcFpvb20odGhpcywgb3B0aW9ucylcclxuICAgICAgICB0aGlzLnBsdWdpbnNTb3J0KClcclxuICAgICAgICByZXR1cm4gdGhpc1xyXG4gICAgfVxyXG5cclxuICAgIC8qKlxyXG4gICAgICogQHByaXZhdGVcclxuICAgICAqIEB0eXBlZGVmIE91dE9mQm91bmRzXHJcbiAgICAgKiBAdHlwZSB7b2JqZWN0fVxyXG4gICAgICogQHByb3BlcnR5IHtib29sZWFufSBsZWZ0XHJcbiAgICAgKiBAcHJvcGVydHkge2Jvb2xlYW59IHJpZ2h0XHJcbiAgICAgKiBAcHJvcGVydHkge2Jvb2xlYW59IHRvcFxyXG4gICAgICogQHByb3BlcnR5IHtib29sZWFufSBib3R0b21cclxuICAgICAqL1xyXG5cclxuICAgIC8qKlxyXG4gICAgICogaXMgY29udGFpbmVyIG91dCBvZiB3b3JsZCBib3VuZHNcclxuICAgICAqIEByZXR1cm4ge091dE9mQm91bmRzfVxyXG4gICAgICogQHByaXZhdGVcclxuICAgICAqL1xyXG4gICAgT09CKClcclxuICAgIHtcclxuICAgICAgICBjb25zdCByZXN1bHQgPSB7fVxyXG4gICAgICAgIHJlc3VsdC5sZWZ0ID0gdGhpcy5sZWZ0IDwgMFxyXG4gICAgICAgIHJlc3VsdC5yaWdodCA9IHRoaXMucmlnaHQgPiB0aGlzLl93b3JsZFdpZHRoXHJcbiAgICAgICAgcmVzdWx0LnRvcCA9IHRoaXMudG9wIDwgMFxyXG4gICAgICAgIHJlc3VsdC5ib3R0b20gPSB0aGlzLmJvdHRvbSA+IHRoaXMuX3dvcmxkSGVpZ2h0XHJcbiAgICAgICAgcmVzdWx0LmNvcm5lclBvaW50ID0ge1xyXG4gICAgICAgICAgICB4OiB0aGlzLl93b3JsZFdpZHRoICogdGhpcy5zY2FsZS54IC0gdGhpcy5fc2NyZWVuV2lkdGgsXHJcbiAgICAgICAgICAgIHk6IHRoaXMuX3dvcmxkSGVpZ2h0ICogdGhpcy5zY2FsZS55IC0gdGhpcy5fc2NyZWVuSGVpZ2h0XHJcbiAgICAgICAgfVxyXG4gICAgICAgIHJldHVybiByZXN1bHRcclxuICAgIH1cclxuXHJcbiAgICAvKipcclxuICAgICAqIHdvcmxkIGNvb3JkaW5hdGVzIG9mIHRoZSByaWdodCBlZGdlIG9mIHRoZSBzY3JlZW5cclxuICAgICAqIEB0eXBlIHtudW1iZXJ9XHJcbiAgICAgKi9cclxuICAgIGdldCByaWdodCgpXHJcbiAgICB7XHJcbiAgICAgICAgcmV0dXJuIC10aGlzLnggLyB0aGlzLnNjYWxlLnggKyB0aGlzLndvcmxkU2NyZWVuV2lkdGhcclxuICAgIH1cclxuICAgIHNldCByaWdodCh2YWx1ZSlcclxuICAgIHtcclxuICAgICAgICB0aGlzLnggPSAtdmFsdWUgKiB0aGlzLnNjYWxlLnggKyB0aGlzLnNjcmVlbldpZHRoXHJcbiAgICAgICAgdGhpcy5fcmVzZXQoKVxyXG4gICAgfVxyXG5cclxuICAgIC8qKlxyXG4gICAgICogd29ybGQgY29vcmRpbmF0ZXMgb2YgdGhlIGxlZnQgZWRnZSBvZiB0aGUgc2NyZWVuXHJcbiAgICAgKiBAdHlwZSB7bnVtYmVyfVxyXG4gICAgICovXHJcbiAgICBnZXQgbGVmdCgpXHJcbiAgICB7XHJcbiAgICAgICAgcmV0dXJuIC10aGlzLnggLyB0aGlzLnNjYWxlLnhcclxuICAgIH1cclxuICAgIHNldCBsZWZ0KHZhbHVlKVxyXG4gICAge1xyXG4gICAgICAgIHRoaXMueCA9IC12YWx1ZSAqIHRoaXMuc2NhbGUueFxyXG4gICAgICAgIHRoaXMuX3Jlc2V0KClcclxuICAgIH1cclxuXHJcbiAgICAvKipcclxuICAgICAqIHdvcmxkIGNvb3JkaW5hdGVzIG9mIHRoZSB0b3AgZWRnZSBvZiB0aGUgc2NyZWVuXHJcbiAgICAgKiBAdHlwZSB7bnVtYmVyfVxyXG4gICAgICovXHJcbiAgICBnZXQgdG9wKClcclxuICAgIHtcclxuICAgICAgICByZXR1cm4gLXRoaXMueSAvIHRoaXMuc2NhbGUueVxyXG4gICAgfVxyXG4gICAgc2V0IHRvcCh2YWx1ZSlcclxuICAgIHtcclxuICAgICAgICB0aGlzLnkgPSAtdmFsdWUgKiB0aGlzLnNjYWxlLnlcclxuICAgICAgICB0aGlzLl9yZXNldCgpXHJcbiAgICB9XHJcblxyXG4gICAgLyoqXHJcbiAgICAgKiB3b3JsZCBjb29yZGluYXRlcyBvZiB0aGUgYm90dG9tIGVkZ2Ugb2YgdGhlIHNjcmVlblxyXG4gICAgICogQHR5cGUge251bWJlcn1cclxuICAgICAqL1xyXG4gICAgZ2V0IGJvdHRvbSgpXHJcbiAgICB7XHJcbiAgICAgICAgcmV0dXJuIC10aGlzLnkgLyB0aGlzLnNjYWxlLnkgKyB0aGlzLndvcmxkU2NyZWVuSGVpZ2h0XHJcbiAgICB9XHJcbiAgICBzZXQgYm90dG9tKHZhbHVlKVxyXG4gICAge1xyXG4gICAgICAgIHRoaXMueSA9IC12YWx1ZSAqIHRoaXMuc2NhbGUueSArIHRoaXMuc2NyZWVuSGVpZ2h0XHJcbiAgICAgICAgdGhpcy5fcmVzZXQoKVxyXG4gICAgfVxyXG4gICAgLyoqXHJcbiAgICAgKiBkZXRlcm1pbmVzIHdoZXRoZXIgdGhlIHZpZXdwb3J0IGlzIGRpcnR5IChpLmUuLCBuZWVkcyB0byBiZSByZW5kZXJlcmVkIHRvIHRoZSBzY3JlZW4gYmVjYXVzZSBvZiBhIGNoYW5nZSlcclxuICAgICAqIEB0eXBlIHtib29sZWFufVxyXG4gICAgICovXHJcbiAgICBnZXQgZGlydHkoKVxyXG4gICAge1xyXG4gICAgICAgIHJldHVybiB0aGlzLl9kaXJ0eVxyXG4gICAgfVxyXG4gICAgc2V0IGRpcnR5KHZhbHVlKVxyXG4gICAge1xyXG4gICAgICAgIHRoaXMuX2RpcnR5ID0gdmFsdWVcclxuICAgIH1cclxuXHJcbiAgICAvKipcclxuICAgICAqIHBlcm1hbmVudGx5IGNoYW5nZXMgdGhlIFZpZXdwb3J0J3MgaGl0QXJlYVxyXG4gICAgICogTk9URTogbm9ybWFsbHkgdGhlIGhpdEFyZWEgPSBQSVhJLlJlY3RhbmdsZShWaWV3cG9ydC5sZWZ0LCBWaWV3cG9ydC50b3AsIFZpZXdwb3J0LndvcmxkU2NyZWVuV2lkdGgsIFZpZXdwb3J0LndvcmxkU2NyZWVuSGVpZ2h0KVxyXG4gICAgICogQHR5cGUgeyhQSVhJLlJlY3RhbmdsZXxQSVhJLkNpcmNsZXxQSVhJLkVsbGlwc2V8UElYSS5Qb2x5Z29ufFBJWEkuUm91bmRlZFJlY3RhbmdsZSl9XHJcbiAgICAgKi9cclxuICAgIGdldCBmb3JjZUhpdEFyZWEoKVxyXG4gICAge1xyXG4gICAgICAgIHJldHVybiB0aGlzLl9mb3JjZUhpdEFyZWFcclxuICAgIH1cclxuICAgIHNldCBmb3JjZUhpdEFyZWEodmFsdWUpXHJcbiAgICB7XHJcbiAgICAgICAgaWYgKHZhbHVlKVxyXG4gICAgICAgIHtcclxuICAgICAgICAgICAgdGhpcy5fZm9yY2VIaXRBcmVhID0gdmFsdWVcclxuICAgICAgICAgICAgdGhpcy5oaXRBcmVhID0gdmFsdWVcclxuICAgICAgICB9XHJcbiAgICAgICAgZWxzZVxyXG4gICAgICAgIHtcclxuICAgICAgICAgICAgdGhpcy5fZm9yY2VIaXRBcmVhID0gZmFsc2VcclxuICAgICAgICAgICAgdGhpcy5oaXRBcmVhID0gbmV3IFBJWEkuUmVjdGFuZ2xlKDAsIDAsIHRoaXMud29ybGRXaWR0aCwgdGhpcy53b3JsZEhlaWdodClcclxuICAgICAgICB9XHJcbiAgICB9XHJcblxyXG4gICAgLyoqXHJcbiAgICAgKiBjb3VudCBvZiBtb3VzZS90b3VjaCBwb2ludGVycyB0aGF0IGFyZSBkb3duIG9uIHRoZSB2aWV3cG9ydFxyXG4gICAgICogQHByaXZhdGVcclxuICAgICAqIEByZXR1cm4ge251bWJlcn1cclxuICAgICAqL1xyXG4gICAgY291bnREb3duUG9pbnRlcnMoKVxyXG4gICAge1xyXG4gICAgICAgIHJldHVybiAodGhpcy5pc01vdXNlRG93biA/IDEgOiAwKSArIHRoaXMudG91Y2hlcy5sZW5ndGhcclxuICAgIH1cclxuXHJcbiAgICAvKipcclxuICAgICAqIGFycmF5IG9mIHRvdWNoIHBvaW50ZXJzIHRoYXQgYXJlIGRvd24gb24gdGhlIHZpZXdwb3J0XHJcbiAgICAgKiBAcHJpdmF0ZVxyXG4gICAgICogQHJldHVybiB7UElYSS5JbnRlcmFjdGlvblRyYWNraW5nRGF0YVtdfVxyXG4gICAgICovXHJcbiAgICBnZXRUb3VjaFBvaW50ZXJzKClcclxuICAgIHtcclxuICAgICAgICBjb25zdCByZXN1bHRzID0gW11cclxuICAgICAgICBjb25zdCBwb2ludGVycyA9IHRoaXMudHJhY2tlZFBvaW50ZXJzXHJcbiAgICAgICAgZm9yIChsZXQga2V5IGluIHBvaW50ZXJzKVxyXG4gICAgICAgIHtcclxuICAgICAgICAgICAgY29uc3QgcG9pbnRlciA9IHBvaW50ZXJzW2tleV1cclxuICAgICAgICAgICAgaWYgKHRoaXMudG91Y2hlcy5pbmRleE9mKHBvaW50ZXIucG9pbnRlcklkKSAhPT0gLTEpXHJcbiAgICAgICAgICAgIHtcclxuICAgICAgICAgICAgICAgIHJlc3VsdHMucHVzaChwb2ludGVyKVxyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfVxyXG4gICAgICAgIHJldHVybiByZXN1bHRzXHJcbiAgICB9XHJcblxyXG4gICAgLyoqXHJcbiAgICAgKiBhcnJheSBvZiBwb2ludGVycyB0aGF0IGFyZSBkb3duIG9uIHRoZSB2aWV3cG9ydFxyXG4gICAgICogQHByaXZhdGVcclxuICAgICAqIEByZXR1cm4ge1BJWEkuSW50ZXJhY3Rpb25UcmFja2luZ0RhdGFbXX1cclxuICAgICAqL1xyXG4gICAgZ2V0UG9pbnRlcnMoKVxyXG4gICAge1xyXG4gICAgICAgIGNvbnN0IHJlc3VsdHMgPSBbXVxyXG4gICAgICAgIGNvbnN0IHBvaW50ZXJzID0gdGhpcy50cmFja2VkUG9pbnRlcnNcclxuICAgICAgICBmb3IgKGxldCBrZXkgaW4gcG9pbnRlcnMpXHJcbiAgICAgICAge1xyXG4gICAgICAgICAgICByZXN1bHRzLnB1c2gocG9pbnRlcnNba2V5XSlcclxuICAgICAgICB9XHJcbiAgICAgICAgcmV0dXJuIHJlc3VsdHNcclxuICAgIH1cclxuXHJcbiAgICAvKipcclxuICAgICAqIGNsYW1wcyBhbmQgcmVzZXRzIGJvdW5jZSBhbmQgZGVjZWxlcmF0ZSAoYXMgbmVlZGVkKSBhZnRlciBtYW51YWxseSBtb3Zpbmcgdmlld3BvcnRcclxuICAgICAqIEBwcml2YXRlXHJcbiAgICAgKi9cclxuICAgIF9yZXNldCgpXHJcbiAgICB7XHJcbiAgICAgICAgaWYgKHRoaXMucGx1Z2luc1snYm91bmNlJ10pXHJcbiAgICAgICAge1xyXG4gICAgICAgICAgICB0aGlzLnBsdWdpbnNbJ2JvdW5jZSddLnJlc2V0KClcclxuICAgICAgICAgICAgdGhpcy5wbHVnaW5zWydib3VuY2UnXS5ib3VuY2UoKVxyXG4gICAgICAgIH1cclxuICAgICAgICBpZiAodGhpcy5wbHVnaW5zWydkZWNlbGVyYXRlJ10pXHJcbiAgICAgICAge1xyXG4gICAgICAgICAgICB0aGlzLnBsdWdpbnNbJ2RlY2VsZXJhdGUnXS5yZXNldCgpXHJcbiAgICAgICAgfVxyXG4gICAgICAgIGlmICh0aGlzLnBsdWdpbnNbJ3NuYXAnXSlcclxuICAgICAgICB7XHJcbiAgICAgICAgICAgIHRoaXMucGx1Z2luc1snc25hcCddLnJlc2V0KClcclxuICAgICAgICB9XHJcbiAgICAgICAgaWYgKHRoaXMucGx1Z2luc1snY2xhbXAnXSlcclxuICAgICAgICB7XHJcbiAgICAgICAgICAgIHRoaXMucGx1Z2luc1snY2xhbXAnXS51cGRhdGUoKVxyXG4gICAgICAgIH1cclxuICAgICAgICBpZiAodGhpcy5wbHVnaW5zWydjbGFtcC16b29tJ10pXHJcbiAgICAgICAge1xyXG4gICAgICAgICAgICB0aGlzLnBsdWdpbnNbJ2NsYW1wLXpvb20nXS5jbGFtcCgpXHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG5cclxuICAgIC8vIFBMVUdJTlNcclxuXHJcbiAgICAvKipcclxuICAgICAqIEluc2VydHMgYSB1c2VyIHBsdWdpbiBpbnRvIHRoZSB2aWV3cG9ydFxyXG4gICAgICogQHBhcmFtIHtzdHJpbmd9IG5hbWUgb2YgcGx1Z2luXHJcbiAgICAgKiBAcGFyYW0ge1BsdWdpbn0gcGx1Z2luIC0gaW5zdGFudGlhdGVkIFBsdWdpbiBjbGFzc1xyXG4gICAgICogQHBhcmFtIHtudW1iZXJ9IFtpbmRleD1sYXN0IGVsZW1lbnRdIHBsdWdpbiBpcyBjYWxsZWQgY3VycmVudCBvcmRlcjogJ2RyYWcnLCAncGluY2gnLCAnd2hlZWwnLCAnZm9sbG93JywgJ21vdXNlLWVkZ2VzJywgJ2RlY2VsZXJhdGUnLCAnYm91bmNlJywgJ3NuYXAtem9vbScsICdjbGFtcC16b29tJywgJ3NuYXAnLCAnY2xhbXAnXHJcbiAgICAgKi9cclxuICAgIHVzZXJQbHVnaW4obmFtZSwgcGx1Z2luLCBpbmRleD1QTFVHSU5fT1JERVIubGVuZ3RoKVxyXG4gICAge1xyXG4gICAgICAgIHRoaXMucGx1Z2luc1tuYW1lXSA9IHBsdWdpblxyXG4gICAgICAgIGNvbnN0IGN1cnJlbnQgPSBQTFVHSU5fT1JERVIuaW5kZXhPZihuYW1lKVxyXG4gICAgICAgIGlmIChjdXJyZW50ICE9PSAtMSlcclxuICAgICAgICB7XHJcbiAgICAgICAgICAgIFBMVUdJTl9PUkRFUi5zcGxpY2UoY3VycmVudCwgMSlcclxuICAgICAgICB9XHJcbiAgICAgICAgUExVR0lOX09SREVSLnNwbGljZShpbmRleCwgMCwgbmFtZSlcclxuICAgICAgICB0aGlzLnBsdWdpbnNTb3J0KClcclxuICAgIH1cclxuXHJcbiAgICAvKipcclxuICAgICAqIHJlbW92ZXMgaW5zdGFsbGVkIHBsdWdpblxyXG4gICAgICogQHBhcmFtIHtzdHJpbmd9IHR5cGUgb2YgcGx1Z2luIChlLmcuLCAnZHJhZycsICdwaW5jaCcpXHJcbiAgICAgKi9cclxuICAgIHJlbW92ZVBsdWdpbih0eXBlKVxyXG4gICAge1xyXG4gICAgICAgIGlmICh0aGlzLnBsdWdpbnNbdHlwZV0pXHJcbiAgICAgICAge1xyXG4gICAgICAgICAgICB0aGlzLnBsdWdpbnNbdHlwZV0gPSBudWxsXHJcbiAgICAgICAgICAgIHRoaXMuZW1pdCh0eXBlICsgJy1yZW1vdmUnKVxyXG4gICAgICAgICAgICB0aGlzLnBsdWdpbnNTb3J0KClcclxuICAgICAgICB9XHJcbiAgICB9XHJcblxyXG4gICAgLyoqXHJcbiAgICAgKiBwYXVzZSBwbHVnaW5cclxuICAgICAqIEBwYXJhbSB7c3RyaW5nfSB0eXBlIG9mIHBsdWdpbiAoZS5nLiwgJ2RyYWcnLCAncGluY2gnKVxyXG4gICAgICovXHJcbiAgICBwYXVzZVBsdWdpbih0eXBlKVxyXG4gICAge1xyXG4gICAgICAgIGlmICh0aGlzLnBsdWdpbnNbdHlwZV0pXHJcbiAgICAgICAge1xyXG4gICAgICAgICAgICB0aGlzLnBsdWdpbnNbdHlwZV0ucGF1c2UoKVxyXG4gICAgICAgIH1cclxuICAgIH1cclxuXHJcbiAgICAvKipcclxuICAgICAqIHJlc3VtZSBwbHVnaW5cclxuICAgICAqIEBwYXJhbSB7c3RyaW5nfSB0eXBlIG9mIHBsdWdpbiAoZS5nLiwgJ2RyYWcnLCAncGluY2gnKVxyXG4gICAgICovXHJcbiAgICByZXN1bWVQbHVnaW4odHlwZSlcclxuICAgIHtcclxuICAgICAgICBpZiAodGhpcy5wbHVnaW5zW3R5cGVdKVxyXG4gICAgICAgIHtcclxuICAgICAgICAgICAgdGhpcy5wbHVnaW5zW3R5cGVdLnJlc3VtZSgpXHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG5cclxuICAgIC8qKlxyXG4gICAgICogc29ydCBwbHVnaW5zIGZvciB1cGRhdGVzXHJcbiAgICAgKiBAcHJpdmF0ZVxyXG4gICAgICovXHJcbiAgICBwbHVnaW5zU29ydCgpXHJcbiAgICB7XHJcbiAgICAgICAgdGhpcy5wbHVnaW5zTGlzdCA9IFtdXHJcbiAgICAgICAgZm9yIChsZXQgcGx1Z2luIG9mIFBMVUdJTl9PUkRFUilcclxuICAgICAgICB7XHJcbiAgICAgICAgICAgIGlmICh0aGlzLnBsdWdpbnNbcGx1Z2luXSlcclxuICAgICAgICAgICAge1xyXG4gICAgICAgICAgICAgICAgdGhpcy5wbHVnaW5zTGlzdC5wdXNoKHRoaXMucGx1Z2luc1twbHVnaW5dKVxyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG5cclxuICAgIC8qKlxyXG4gICAgICogZW5hYmxlIG9uZS1maW5nZXIgdG91Y2ggdG8gZHJhZ1xyXG4gICAgICogQHBhcmFtIHtvYmplY3R9IFtvcHRpb25zXVxyXG4gICAgICogQHBhcmFtIHtzdHJpbmd9IFtvcHRpb25zLmRpcmVjdGlvbj1hbGxdIGRpcmVjdGlvbiB0byBkcmFnIChhbGwsIHgsIG9yIHkpXHJcbiAgICAgKiBAcGFyYW0ge2Jvb2xlYW59IFtvcHRpb25zLndoZWVsPXRydWVdIHVzZSB3aGVlbCB0byBzY3JvbGwgaW4geSBkaXJlY3Rpb24gKHVubGVzcyB3aGVlbCBwbHVnaW4gaXMgYWN0aXZlKVxyXG4gICAgICogQHBhcmFtIHtudW1iZXJ9IFtvcHRpb25zLndoZWVsU2Nyb2xsPTFdIG51bWJlciBvZiBwaXhlbHMgdG8gc2Nyb2xsIHdpdGggZWFjaCB3aGVlbCBzcGluXHJcbiAgICAgKiBAcGFyYW0ge2Jvb2xlYW59IFtvcHRpb25zLnJldmVyc2VdIHJldmVyc2UgdGhlIGRpcmVjdGlvbiBvZiB0aGUgd2hlZWwgc2Nyb2xsXHJcbiAgICAgKiBAcGFyYW0ge2Jvb2xlYW58c3RyaW5nfSBbb3B0aW9ucy5jbGFtcFdoZWVsXSAodHJ1ZSwgeCwgb3IgeSkgY2xhbXAgd2hlZWwgKHRvIGF2b2lkIHdlaXJkIGJvdW5jZSB3aXRoIG1vdXNlIHdoZWVsKVxyXG4gICAgICogQHBhcmFtIHtzdHJpbmd9IFtvcHRpb25zLnVuZGVyZmxvdz1jZW50ZXJdICh0b3AvYm90dG9tL2NlbnRlciBhbmQgbGVmdC9yaWdodC9jZW50ZXIsIG9yIGNlbnRlcikgd2hlcmUgdG8gcGxhY2Ugd29ybGQgaWYgdG9vIHNtYWxsIGZvciBzY3JlZW5cclxuICAgICAqIEBwYXJhbSB7bnVtYmVyfSBbb3B0aW9ucy5mYWN0b3I9MV0gZmFjdG9yIHRvIG11bHRpcGx5IGRyYWcgdG8gaW5jcmVhc2UgdGhlIHNwZWVkIG9mIG1vdmVtZW50XHJcbiAgICAgKiBAcGFyYW0ge3N0cmluZ30gW29wdGlvbnMubW91c2VCdXR0b25zPWFsbF0gY2hhbmdlcyB3aGljaCBtb3VzZSBidXR0b25zIHRyaWdnZXIgZHJhZywgdXNlOiAnYWxsJywgJ2xlZnQnLCByaWdodCcgJ21pZGRsZScsIG9yIHNvbWUgY29tYmluYXRpb24sIGxpa2UsICdtaWRkbGUtcmlnaHQnXHJcbiAgICAgKi9cclxuICAgIGRyYWcob3B0aW9ucylcclxuICAgIHtcclxuICAgICAgICB0aGlzLnBsdWdpbnNbJ2RyYWcnXSA9IG5ldyBEcmFnKHRoaXMsIG9wdGlvbnMpXHJcbiAgICAgICAgdGhpcy5wbHVnaW5zU29ydCgpXHJcbiAgICAgICAgcmV0dXJuIHRoaXNcclxuICAgIH1cclxuXHJcbiAgICAvKipcclxuICAgICAqIGNsYW1wIHRvIHdvcmxkIGJvdW5kYXJpZXMgb3Igb3RoZXIgcHJvdmlkZWQgYm91bmRhcmllc1xyXG4gICAgICogTk9URVM6XHJcbiAgICAgKiAgIGNsYW1wIGlzIGRpc2FibGVkIGlmIGNhbGxlZCB3aXRoIG5vIG9wdGlvbnM7IHVzZSB7IGRpcmVjdGlvbjogJ2FsbCcgfSBmb3IgYWxsIGVkZ2UgY2xhbXBpbmdcclxuICAgICAqICAgc2NyZWVuV2lkdGgsIHNjcmVlbkhlaWdodCwgd29ybGRXaWR0aCwgYW5kIHdvcmxkSGVpZ2h0IG5lZWRzIHRvIGJlIHNldCBmb3IgdGhpcyB0byB3b3JrIHByb3Blcmx5XHJcbiAgICAgKiBAcGFyYW0ge29iamVjdH0gW29wdGlvbnNdXHJcbiAgICAgKiBAcGFyYW0geyhudW1iZXJ8Ym9vbGVhbil9IFtvcHRpb25zLmxlZnRdIGNsYW1wIGxlZnQ7IHRydWU9MFxyXG4gICAgICogQHBhcmFtIHsobnVtYmVyfGJvb2xlYW4pfSBbb3B0aW9ucy5yaWdodF0gY2xhbXAgcmlnaHQ7IHRydWU9dmlld3BvcnQud29ybGRXaWR0aFxyXG4gICAgICogQHBhcmFtIHsobnVtYmVyfGJvb2xlYW4pfSBbb3B0aW9ucy50b3BdIGNsYW1wIHRvcDsgdHJ1ZT0wXHJcbiAgICAgKiBAcGFyYW0geyhudW1iZXJ8Ym9vbGVhbil9IFtvcHRpb25zLmJvdHRvbV0gY2xhbXAgYm90dG9tOyB0cnVlPXZpZXdwb3J0LndvcmxkSGVpZ2h0XHJcbiAgICAgKiBAcGFyYW0ge3N0cmluZ30gW29wdGlvbnMuZGlyZWN0aW9uXSAoYWxsLCB4LCBvciB5KSB1c2luZyBjbGFtcHMgb2YgWzAsIHZpZXdwb3J0LndvcmxkV2lkdGgvdmlld3BvcnQud29ybGRIZWlnaHRdOyByZXBsYWNlcyBsZWZ0L3JpZ2h0L3RvcC9ib3R0b20gaWYgc2V0XHJcbiAgICAgKiBAcGFyYW0ge3N0cmluZ30gW29wdGlvbnMudW5kZXJmbG93PWNlbnRlcl0gKG5vbmUgT1IgKHRvcC9ib3R0b20vY2VudGVyIGFuZCBsZWZ0L3JpZ2h0L2NlbnRlcikgT1IgY2VudGVyKSB3aGVyZSB0byBwbGFjZSB3b3JsZCBpZiB0b28gc21hbGwgZm9yIHNjcmVlbiAoZS5nLiwgdG9wLXJpZ2h0LCBjZW50ZXIsIG5vbmUsIGJvdHRvbWxlZnQpXHJcbiAgICAgKiBAcmV0dXJuIHtWaWV3cG9ydH0gdGhpc1xyXG4gICAgICovXHJcbiAgICBjbGFtcChvcHRpb25zKVxyXG4gICAge1xyXG4gICAgICAgIHRoaXMucGx1Z2luc1snY2xhbXAnXSA9IG5ldyBDbGFtcCh0aGlzLCBvcHRpb25zKVxyXG4gICAgICAgIHRoaXMucGx1Z2luc1NvcnQoKVxyXG4gICAgICAgIHJldHVybiB0aGlzXHJcbiAgICB9XHJcblxyXG4gICAgLyoqXHJcbiAgICAgKiBkZWNlbGVyYXRlIGFmdGVyIGEgbW92ZVxyXG4gICAgICogQHBhcmFtIHtvYmplY3R9IFtvcHRpb25zXVxyXG4gICAgICogQHBhcmFtIHtudW1iZXJ9IFtvcHRpb25zLmZyaWN0aW9uPTAuOTVdIHBlcmNlbnQgdG8gZGVjZWxlcmF0ZSBhZnRlciBtb3ZlbWVudFxyXG4gICAgICogQHBhcmFtIHtudW1iZXJ9IFtvcHRpb25zLmJvdW5jZT0wLjhdIHBlcmNlbnQgdG8gZGVjZWxlcmF0ZSB3aGVuIHBhc3QgYm91bmRhcmllcyAob25seSBhcHBsaWNhYmxlIHdoZW4gdmlld3BvcnQuYm91bmNlKCkgaXMgYWN0aXZlKVxyXG4gICAgICogQHBhcmFtIHtudW1iZXJ9IFtvcHRpb25zLm1pblNwZWVkPTAuMDFdIG1pbmltdW0gdmVsb2NpdHkgYmVmb3JlIHN0b3BwaW5nL3JldmVyc2luZyBhY2NlbGVyYXRpb25cclxuICAgICAqIEByZXR1cm4ge1ZpZXdwb3J0fSB0aGlzXHJcbiAgICAgKi9cclxuICAgIGRlY2VsZXJhdGUob3B0aW9ucylcclxuICAgIHtcclxuICAgICAgICB0aGlzLnBsdWdpbnNbJ2RlY2VsZXJhdGUnXSA9IG5ldyBEZWNlbGVyYXRlKHRoaXMsIG9wdGlvbnMpXHJcbiAgICAgICAgdGhpcy5wbHVnaW5zU29ydCgpXHJcbiAgICAgICAgcmV0dXJuIHRoaXNcclxuICAgIH1cclxuXHJcbiAgICAvKipcclxuICAgICAqIGJvdW5jZSBvbiBib3JkZXJzXHJcbiAgICAgKiBOT1RFOiBzY3JlZW5XaWR0aCwgc2NyZWVuSGVpZ2h0LCB3b3JsZFdpZHRoLCBhbmQgd29ybGRIZWlnaHQgbmVlZHMgdG8gYmUgc2V0IGZvciB0aGlzIHRvIHdvcmsgcHJvcGVybHlcclxuICAgICAqIEBwYXJhbSB7b2JqZWN0fSBbb3B0aW9uc11cclxuICAgICAqIEBwYXJhbSB7c3RyaW5nfSBbb3B0aW9ucy5zaWRlcz1hbGxdIGFsbCwgaG9yaXpvbnRhbCwgdmVydGljYWwsIG9yIGNvbWJpbmF0aW9uIG9mIHRvcCwgYm90dG9tLCByaWdodCwgbGVmdCAoZS5nLiwgJ3RvcC1ib3R0b20tcmlnaHQnKVxyXG4gICAgICogQHBhcmFtIHtudW1iZXJ9IFtvcHRpb25zLmZyaWN0aW9uPTAuNV0gZnJpY3Rpb24gdG8gYXBwbHkgdG8gZGVjZWxlcmF0ZSBpZiBhY3RpdmVcclxuICAgICAqIEBwYXJhbSB7bnVtYmVyfSBbb3B0aW9ucy50aW1lPTE1MF0gdGltZSBpbiBtcyB0byBmaW5pc2ggYm91bmNlXHJcbiAgICAgKiBAcGFyYW0ge3N0cmluZ3xmdW5jdGlvbn0gW29wdGlvbnMuZWFzZT1lYXNlSW5PdXRTaW5lXSBlYXNlIGZ1bmN0aW9uIG9yIG5hbWUgKHNlZSBodHRwOi8vZWFzaW5ncy5uZXQvIGZvciBzdXBwb3J0ZWQgbmFtZXMpXHJcbiAgICAgKiBAcGFyYW0ge3N0cmluZ30gW29wdGlvbnMudW5kZXJmbG93PWNlbnRlcl0gKHRvcC9ib3R0b20vY2VudGVyIGFuZCBsZWZ0L3JpZ2h0L2NlbnRlciwgb3IgY2VudGVyKSB3aGVyZSB0byBwbGFjZSB3b3JsZCBpZiB0b28gc21hbGwgZm9yIHNjcmVlblxyXG4gICAgICogQHJldHVybiB7Vmlld3BvcnR9IHRoaXNcclxuICAgICAqL1xyXG4gICAgYm91bmNlKG9wdGlvbnMpXHJcbiAgICB7XHJcbiAgICAgICAgdGhpcy5wbHVnaW5zWydib3VuY2UnXSA9IG5ldyBCb3VuY2UodGhpcywgb3B0aW9ucylcclxuICAgICAgICB0aGlzLnBsdWdpbnNTb3J0KClcclxuICAgICAgICByZXR1cm4gdGhpc1xyXG4gICAgfVxyXG5cclxuICAgIC8qKlxyXG4gICAgICogZW5hYmxlIHBpbmNoIHRvIHpvb20gYW5kIHR3by1maW5nZXIgdG91Y2ggdG8gZHJhZ1xyXG4gICAgICogTk9URTogc2NyZWVuV2lkdGgsIHNjcmVlbkhlaWdodCwgd29ybGRXaWR0aCwgYW5kIHdvcmxkSGVpZ2h0IG5lZWRzIHRvIGJlIHNldCBmb3IgdGhpcyB0byB3b3JrIHByb3Blcmx5XHJcbiAgICAgKiBAcGFyYW0ge251bWJlcn0gW29wdGlvbnMucGVyY2VudD0xLjBdIHBlcmNlbnQgdG8gbW9kaWZ5IHBpbmNoIHNwZWVkXHJcbiAgICAgKiBAcGFyYW0ge2Jvb2xlYW59IFtvcHRpb25zLm5vRHJhZ10gZGlzYWJsZSB0d28tZmluZ2VyIGRyYWdnaW5nXHJcbiAgICAgKiBAcGFyYW0ge1BJWEkuUG9pbnR9IFtvcHRpb25zLmNlbnRlcl0gcGxhY2UgdGhpcyBwb2ludCBhdCBjZW50ZXIgZHVyaW5nIHpvb20gaW5zdGVhZCBvZiBjZW50ZXIgb2YgdHdvIGZpbmdlcnNcclxuICAgICAqIEByZXR1cm4ge1ZpZXdwb3J0fSB0aGlzXHJcbiAgICAgKi9cclxuICAgIHBpbmNoKG9wdGlvbnMpXHJcbiAgICB7XHJcbiAgICAgICAgdGhpcy5wbHVnaW5zWydwaW5jaCddID0gbmV3IFBpbmNoKHRoaXMsIG9wdGlvbnMpXHJcbiAgICAgICAgdGhpcy5wbHVnaW5zU29ydCgpXHJcbiAgICAgICAgcmV0dXJuIHRoaXNcclxuICAgIH1cclxuXHJcbiAgICAvKipcclxuICAgICAqIHNuYXAgdG8gYSBwb2ludFxyXG4gICAgICogQHBhcmFtIHtudW1iZXJ9IHhcclxuICAgICAqIEBwYXJhbSB7bnVtYmVyfSB5XHJcbiAgICAgKiBAcGFyYW0ge29iamVjdH0gW29wdGlvbnNdXHJcbiAgICAgKiBAcGFyYW0ge2Jvb2xlYW59IFtvcHRpb25zLnRvcExlZnRdIHNuYXAgdG8gdGhlIHRvcC1sZWZ0IG9mIHZpZXdwb3J0IGluc3RlYWQgb2YgY2VudGVyXHJcbiAgICAgKiBAcGFyYW0ge251bWJlcn0gW29wdGlvbnMuZnJpY3Rpb249MC44XSBmcmljdGlvbi9mcmFtZSB0byBhcHBseSBpZiBkZWNlbGVyYXRlIGlzIGFjdGl2ZVxyXG4gICAgICogQHBhcmFtIHtudW1iZXJ9IFtvcHRpb25zLnRpbWU9MTAwMF1cclxuICAgICAqIEBwYXJhbSB7c3RyaW5nfGZ1bmN0aW9ufSBbb3B0aW9ucy5lYXNlPWVhc2VJbk91dFNpbmVdIGVhc2UgZnVuY3Rpb24gb3IgbmFtZSAoc2VlIGh0dHA6Ly9lYXNpbmdzLm5ldC8gZm9yIHN1cHBvcnRlZCBuYW1lcylcclxuICAgICAqIEBwYXJhbSB7Ym9vbGVhbn0gW29wdGlvbnMuaW50ZXJydXB0PXRydWVdIHBhdXNlIHNuYXBwaW5nIHdpdGggYW55IHVzZXIgaW5wdXQgb24gdGhlIHZpZXdwb3J0XHJcbiAgICAgKiBAcGFyYW0ge2Jvb2xlYW59IFtvcHRpb25zLnJlbW92ZU9uQ29tcGxldGVdIHJlbW92ZXMgdGhpcyBwbHVnaW4gYWZ0ZXIgc25hcHBpbmcgaXMgY29tcGxldGVcclxuICAgICAqIEBwYXJhbSB7Ym9vbGVhbn0gW29wdGlvbnMucmVtb3ZlT25JbnRlcnJ1cHRdIHJlbW92ZXMgdGhpcyBwbHVnaW4gaWYgaW50ZXJydXB0ZWQgYnkgYW55IHVzZXIgaW5wdXRcclxuICAgICAqIEBwYXJhbSB7Ym9vbGVhbn0gW29wdGlvbnMuZm9yY2VTdGFydF0gc3RhcnRzIHRoZSBzbmFwIGltbWVkaWF0ZWx5IHJlZ2FyZGxlc3Mgb2Ygd2hldGhlciB0aGUgdmlld3BvcnQgaXMgYXQgdGhlIGRlc2lyZWQgbG9jYXRpb25cclxuICAgICAqIEByZXR1cm4ge1ZpZXdwb3J0fSB0aGlzXHJcbiAgICAgKi9cclxuICAgIHNuYXAoeCwgeSwgb3B0aW9ucylcclxuICAgIHtcclxuICAgICAgICB0aGlzLnBsdWdpbnNbJ3NuYXAnXSA9IG5ldyBTbmFwKHRoaXMsIHgsIHksIG9wdGlvbnMpXHJcbiAgICAgICAgdGhpcy5wbHVnaW5zU29ydCgpXHJcbiAgICAgICAgcmV0dXJuIHRoaXNcclxuICAgIH1cclxuXHJcbiAgICAvKipcclxuICAgICAqIGZvbGxvdyBhIHRhcmdldFxyXG4gICAgICogTk9URVM6XHJcbiAgICAgKiAgICAtIHVzZXMgdGhlICh4LCB5KSBhcyB0aGUgY2VudGVyIHRvIGZvbGxvdzsgZm9yIFBJWEkuU3ByaXRlIHRvIHdvcmsgcHJvcGVybHksIHVzZSBzcHJpdGUuYW5jaG9yLnNldCgwLjUpXHJcbiAgICAgKiAgICAtIG9wdGlvbnMuYWNjZWxlcmF0aW9uIGlzIG5vdCBwZXJmZWN0IGFzIGl0IGRvZXNuJ3Qga25vdyB0aGUgdmVsb2NpdHkgb2YgdGhlIHRhcmdldDtcclxuICAgICAqICAgICAgaXQgZG9lcyBhZGQgYWNjZWxlcmF0aW9uIHRvIHRoZSBzdGFydCBvZiBtb3ZlbWVudCBhbmQgZGVjZWxlcmF0aW9uIHRvIHRoZSBlbmQgb2YgbW92ZW1lbnQgd2hlbiB0aGUgdGFyZ2V0IGlzIHN0b3BwZWRcclxuICAgICAqIEBwYXJhbSB7UElYSS5EaXNwbGF5T2JqZWN0fSB0YXJnZXQgdG8gZm9sbG93IChvYmplY3QgbXVzdCBpbmNsdWRlIHt4OiB4LWNvb3JkaW5hdGUsIHk6IHktY29vcmRpbmF0ZX0pXHJcbiAgICAgKiBAcGFyYW0ge29iamVjdH0gW29wdGlvbnNdXHJcbiAgICAgKiBAcGFyYW0ge251bWJlcn0gW29wdGlvbnMuc3BlZWQ9MF0gdG8gZm9sbG93IGluIHBpeGVscy9mcmFtZSAoMD10ZWxlcG9ydCB0byBsb2NhdGlvbilcclxuICAgICAqIEBwYXJhbSB7bnVtYmVyfSBbb3B0aW9ucy5hY2NlbGVyYXRpb25dIHNldCBhY2NlbGVyYXRpb24gdG8gYWNjZWxlcmF0ZSBhbmQgZGVjZWxlcmF0ZSBhdCB0aGlzIHJhdGU7IHNwZWVkIGNhbm5vdCBiZSAwIHRvIHVzZSBhY2NlbGVyYXRpb25cclxuICAgICAqIEBwYXJhbSB7bnVtYmVyfSBbb3B0aW9ucy5yYWRpdXNdIHJhZGl1cyAoaW4gd29ybGQgY29vcmRpbmF0ZXMpIG9mIGNlbnRlciBjaXJjbGUgd2hlcmUgbW92ZW1lbnQgaXMgYWxsb3dlZCB3aXRob3V0IG1vdmluZyB0aGUgdmlld3BvcnRcclxuICAgICAqIEByZXR1cm4ge1ZpZXdwb3J0fSB0aGlzXHJcbiAgICAgKi9cclxuICAgIGZvbGxvdyh0YXJnZXQsIG9wdGlvbnMpXHJcbiAgICB7XHJcbiAgICAgICAgdGhpcy5wbHVnaW5zWydmb2xsb3cnXSA9IG5ldyBGb2xsb3codGhpcywgdGFyZ2V0LCBvcHRpb25zKVxyXG4gICAgICAgIHRoaXMucGx1Z2luc1NvcnQoKVxyXG4gICAgICAgIHJldHVybiB0aGlzXHJcbiAgICB9XHJcblxyXG4gICAgLyoqXHJcbiAgICAgKiB6b29tIHVzaW5nIG1vdXNlIHdoZWVsXHJcbiAgICAgKiBAcGFyYW0ge29iamVjdH0gW29wdGlvbnNdXHJcbiAgICAgKiBAcGFyYW0ge251bWJlcn0gW29wdGlvbnMucGVyY2VudD0wLjFdIHBlcmNlbnQgdG8gc2Nyb2xsIHdpdGggZWFjaCBzcGluXHJcbiAgICAgKiBAcGFyYW0ge2Jvb2xlYW59IFtvcHRpb25zLnJldmVyc2VdIHJldmVyc2UgdGhlIGRpcmVjdGlvbiBvZiB0aGUgc2Nyb2xsXHJcbiAgICAgKiBAcGFyYW0ge1BJWEkuUG9pbnR9IFtvcHRpb25zLmNlbnRlcl0gcGxhY2UgdGhpcyBwb2ludCBhdCBjZW50ZXIgZHVyaW5nIHpvb20gaW5zdGVhZCBvZiBjdXJyZW50IG1vdXNlIHBvc2l0aW9uXHJcbiAgICAgKiBAcmV0dXJuIHtWaWV3cG9ydH0gdGhpc1xyXG4gICAgICovXHJcbiAgICB3aGVlbChvcHRpb25zKVxyXG4gICAge1xyXG4gICAgICAgIHRoaXMucGx1Z2luc1snd2hlZWwnXSA9IG5ldyBXaGVlbCh0aGlzLCBvcHRpb25zKVxyXG4gICAgICAgIHRoaXMucGx1Z2luc1NvcnQoKVxyXG4gICAgICAgIHJldHVybiB0aGlzXHJcbiAgICB9XHJcblxyXG4gICAgLyoqXHJcbiAgICAgKiBlbmFibGUgY2xhbXBpbmcgb2Ygem9vbSB0byBjb25zdHJhaW50c1xyXG4gICAgICogTk9URTogc2NyZWVuV2lkdGgsIHNjcmVlbkhlaWdodCwgd29ybGRXaWR0aCwgYW5kIHdvcmxkSGVpZ2h0IG5lZWRzIHRvIGJlIHNldCBmb3IgdGhpcyB0byB3b3JrIHByb3Blcmx5XHJcbiAgICAgKiBAcGFyYW0ge29iamVjdH0gW29wdGlvbnNdXHJcbiAgICAgKiBAcGFyYW0ge251bWJlcn0gW29wdGlvbnMubWluV2lkdGhdIG1pbmltdW0gd2lkdGhcclxuICAgICAqIEBwYXJhbSB7bnVtYmVyfSBbb3B0aW9ucy5taW5IZWlnaHRdIG1pbmltdW0gaGVpZ2h0XHJcbiAgICAgKiBAcGFyYW0ge251bWJlcn0gW29wdGlvbnMubWF4V2lkdGhdIG1heGltdW0gd2lkdGhcclxuICAgICAqIEBwYXJhbSB7bnVtYmVyfSBbb3B0aW9ucy5tYXhIZWlnaHRdIG1heGltdW0gaGVpZ2h0XHJcbiAgICAgKiBAcmV0dXJuIHtWaWV3cG9ydH0gdGhpc1xyXG4gICAgICovXHJcbiAgICBjbGFtcFpvb20ob3B0aW9ucylcclxuICAgIHtcclxuICAgICAgICB0aGlzLnBsdWdpbnNbJ2NsYW1wLXpvb20nXSA9IG5ldyBDbGFtcFpvb20odGhpcywgb3B0aW9ucylcclxuICAgICAgICB0aGlzLnBsdWdpbnNTb3J0KClcclxuICAgICAgICByZXR1cm4gdGhpc1xyXG4gICAgfVxyXG5cclxuICAgIC8qKlxyXG4gICAgICogU2Nyb2xsIHZpZXdwb3J0IHdoZW4gbW91c2UgaG92ZXJzIG5lYXIgb25lIG9mIHRoZSBlZGdlcyBvciByYWRpdXMtZGlzdGFuY2UgZnJvbSBjZW50ZXIgb2Ygc2NyZWVuLlxyXG4gICAgICogQHBhcmFtIHtvYmplY3R9IFtvcHRpb25zXVxyXG4gICAgICogQHBhcmFtIHtudW1iZXJ9IFtvcHRpb25zLnJhZGl1c10gZGlzdGFuY2UgZnJvbSBjZW50ZXIgb2Ygc2NyZWVuIGluIHNjcmVlbiBwaXhlbHNcclxuICAgICAqIEBwYXJhbSB7bnVtYmVyfSBbb3B0aW9ucy5kaXN0YW5jZV0gZGlzdGFuY2UgZnJvbSBhbGwgc2lkZXMgaW4gc2NyZWVuIHBpeGVsc1xyXG4gICAgICogQHBhcmFtIHtudW1iZXJ9IFtvcHRpb25zLnRvcF0gYWx0ZXJuYXRpdmVseSwgc2V0IHRvcCBkaXN0YW5jZSAobGVhdmUgdW5zZXQgZm9yIG5vIHRvcCBzY3JvbGwpXHJcbiAgICAgKiBAcGFyYW0ge251bWJlcn0gW29wdGlvbnMuYm90dG9tXSBhbHRlcm5hdGl2ZWx5LCBzZXQgYm90dG9tIGRpc3RhbmNlIChsZWF2ZSB1bnNldCBmb3Igbm8gYm90dG9tIHNjcm9sbClcclxuICAgICAqIEBwYXJhbSB7bnVtYmVyfSBbb3B0aW9ucy5sZWZ0XSBhbHRlcm5hdGl2ZWx5LCBzZXQgbGVmdCBkaXN0YW5jZSAobGVhdmUgdW5zZXQgZm9yIG5vIGxlZnQgc2Nyb2xsKVxyXG4gICAgICogQHBhcmFtIHtudW1iZXJ9IFtvcHRpb25zLnJpZ2h0XSBhbHRlcm5hdGl2ZWx5LCBzZXQgcmlnaHQgZGlzdGFuY2UgKGxlYXZlIHVuc2V0IGZvciBubyByaWdodCBzY3JvbGwpXHJcbiAgICAgKiBAcGFyYW0ge251bWJlcn0gW29wdGlvbnMuc3BlZWQ9OF0gc3BlZWQgaW4gcGl4ZWxzL2ZyYW1lIHRvIHNjcm9sbCB2aWV3cG9ydFxyXG4gICAgICogQHBhcmFtIHtib29sZWFufSBbb3B0aW9ucy5yZXZlcnNlXSByZXZlcnNlIGRpcmVjdGlvbiBvZiBzY3JvbGxcclxuICAgICAqIEBwYXJhbSB7Ym9vbGVhbn0gW29wdGlvbnMubm9EZWNlbGVyYXRlXSBkb24ndCB1c2UgZGVjZWxlcmF0ZSBwbHVnaW4gZXZlbiBpZiBpdCdzIGluc3RhbGxlZFxyXG4gICAgICogQHBhcmFtIHtib29sZWFufSBbb3B0aW9ucy5saW5lYXJdIGlmIHVzaW5nIHJhZGl1cywgdXNlIGxpbmVhciBtb3ZlbWVudCAoKy8tIDEsICsvLSAxKSBpbnN0ZWFkIG9mIGFuZ2xlZCBtb3ZlbWVudCAoTWF0aC5jb3MoYW5nbGUgZnJvbSBjZW50ZXIpLCBNYXRoLnNpbihhbmdsZSBmcm9tIGNlbnRlcikpXHJcbiAgICAgKiBAcGFyYW0ge2Jvb2xlYW59IFtvcHRpb25zLmFsbG93QnV0dG9uc10gYWxsb3dzIHBsdWdpbiB0byBjb250aW51ZSB3b3JraW5nIGV2ZW4gd2hlbiB0aGVyZSdzIGEgbW91c2Vkb3duIGV2ZW50XHJcbiAgICAgKi9cclxuICAgIG1vdXNlRWRnZXMob3B0aW9ucylcclxuICAgIHtcclxuICAgICAgICB0aGlzLnBsdWdpbnNbJ21vdXNlLWVkZ2VzJ10gPSBuZXcgTW91c2VFZGdlcyh0aGlzLCBvcHRpb25zKVxyXG4gICAgICAgIHRoaXMucGx1Z2luc1NvcnQoKVxyXG4gICAgICAgIHJldHVybiB0aGlzXHJcbiAgICB9XHJcblxyXG4gICAgLyoqXHJcbiAgICAgKiBwYXVzZSB2aWV3cG9ydCAoaW5jbHVkaW5nIGFuaW1hdGlvbiB1cGRhdGVzIHN1Y2ggYXMgZGVjZWxlcmF0ZSlcclxuICAgICAqIE5PVEU6IHdoZW4gc2V0dGluZyBwYXVzZT10cnVlLCBhbGwgdG91Y2hlcyBhbmQgbW91c2UgYWN0aW9ucyBhcmUgY2xlYXJlZCAoaS5lLiwgaWYgbW91c2Vkb3duIHdhcyBhY3RpdmUsIGl0IGJlY29tZXMgaW5hY3RpdmUgZm9yIHB1cnBvc2VzIG9mIHRoZSB2aWV3cG9ydClcclxuICAgICAqIEB0eXBlIHtib29sZWFufVxyXG4gICAgICovXHJcbiAgICBnZXQgcGF1c2UoKSB7IHJldHVybiB0aGlzLl9wYXVzZSB9XHJcbiAgICBzZXQgcGF1c2UodmFsdWUpXHJcbiAgICB7XHJcbiAgICAgICAgdGhpcy5fcGF1c2UgPSB2YWx1ZVxyXG4gICAgICAgIHRoaXMubGFzdFZpZXdwb3J0ID0gbnVsbFxyXG4gICAgICAgIHRoaXMubW92aW5nID0gZmFsc2VcclxuICAgICAgICB0aGlzLnpvb21pbmcgPSBmYWxzZVxyXG4gICAgICAgIGlmICh2YWx1ZSlcclxuICAgICAgICB7XHJcbiAgICAgICAgICAgIHRoaXMudG91Y2hlcyA9IFtdXHJcbiAgICAgICAgICAgIHRoaXMuaXNNb3VzZURvd24gPSBmYWxzZVxyXG4gICAgICAgIH1cclxuICAgIH1cclxuXHJcbiAgICAvKipcclxuICAgICAqIG1vdmUgdGhlIHZpZXdwb3J0IHNvIHRoZSBib3VuZGluZyBib3ggaXMgdmlzaWJsZVxyXG4gICAgICogQHBhcmFtIHtudW1iZXJ9IHhcclxuICAgICAqIEBwYXJhbSB7bnVtYmVyfSB5XHJcbiAgICAgKiBAcGFyYW0ge251bWJlcn0gd2lkdGhcclxuICAgICAqIEBwYXJhbSB7bnVtYmVyfSBoZWlnaHRcclxuICAgICAqL1xyXG4gICAgZW5zdXJlVmlzaWJsZSh4LCB5LCB3aWR0aCwgaGVpZ2h0KVxyXG4gICAge1xyXG4gICAgICAgIGlmICh4IDwgdGhpcy5sZWZ0KVxyXG4gICAgICAgIHtcclxuICAgICAgICAgICAgdGhpcy5sZWZ0ID0geFxyXG4gICAgICAgIH1cclxuICAgICAgICBlbHNlIGlmICh4ICsgd2lkdGggPiB0aGlzLnJpZ2h0KVxyXG4gICAgICAgIHtcclxuICAgICAgICAgICAgdGhpcy5yaWdodCA9IHggKyB3aWR0aFxyXG4gICAgICAgIH1cclxuICAgICAgICBpZiAoeSA8IHRoaXMudG9wKVxyXG4gICAgICAgIHtcclxuICAgICAgICAgICAgdGhpcy50b3AgPSB5XHJcbiAgICAgICAgfVxyXG4gICAgICAgIGVsc2UgaWYgKHkgKyBoZWlnaHQgPiB0aGlzLmJvdHRvbSlcclxuICAgICAgICB7XHJcbiAgICAgICAgICAgIHRoaXMuYm90dG9tID0geSArIGhlaWdodFxyXG4gICAgICAgIH1cclxuICAgIH1cclxufVxyXG5cclxuLyoqXHJcbiAqIGZpcmVzIGFmdGVyIGEgbW91c2Ugb3IgdG91Y2ggY2xpY2tcclxuICogQGV2ZW50IFZpZXdwb3J0I2NsaWNrZWRcclxuICogQHR5cGUge29iamVjdH1cclxuICogQHByb3BlcnR5IHtQSVhJLlBvaW50fSBzY3JlZW5cclxuICogQHByb3BlcnR5IHtQSVhJLlBvaW50fSB3b3JsZFxyXG4gKiBAcHJvcGVydHkge1ZpZXdwb3J0fSB2aWV3cG9ydFxyXG4gKi9cclxuXHJcbi8qKlxyXG4gKiBmaXJlcyB3aGVuIGEgZHJhZyBzdGFydHNcclxuICogQGV2ZW50IFZpZXdwb3J0I2RyYWctc3RhcnRcclxuICogQHR5cGUge29iamVjdH1cclxuICogQHByb3BlcnR5IHtQSVhJLlBvaW50fSBzY3JlZW5cclxuICogQHByb3BlcnR5IHtQSVhJLlBvaW50fSB3b3JsZFxyXG4gKiBAcHJvcGVydHkge1ZpZXdwb3J0fSB2aWV3cG9ydFxyXG4gKi9cclxuXHJcbi8qKlxyXG4gKiBmaXJlcyB3aGVuIGEgZHJhZyBlbmRzXHJcbiAqIEBldmVudCBWaWV3cG9ydCNkcmFnLWVuZFxyXG4gKiBAdHlwZSB7b2JqZWN0fVxyXG4gKiBAcHJvcGVydHkge1BJWEkuUG9pbnR9IHNjcmVlblxyXG4gKiBAcHJvcGVydHkge1BJWEkuUG9pbnR9IHdvcmxkXHJcbiAqIEBwcm9wZXJ0eSB7Vmlld3BvcnR9IHZpZXdwb3J0XHJcbiAqL1xyXG5cclxuLyoqXHJcbiAqIGZpcmVzIHdoZW4gYSBwaW5jaCBzdGFydHNcclxuICogQGV2ZW50IFZpZXdwb3J0I3BpbmNoLXN0YXJ0XHJcbiAqIEB0eXBlIHtWaWV3cG9ydH1cclxuICovXHJcblxyXG4vKipcclxuICogZmlyZXMgd2hlbiBhIHBpbmNoIGVuZFxyXG4gKiBAZXZlbnQgVmlld3BvcnQjcGluY2gtZW5kXHJcbiAqIEB0eXBlIHtWaWV3cG9ydH1cclxuICovXHJcblxyXG4vKipcclxuICogZmlyZXMgd2hlbiBhIHNuYXAgc3RhcnRzXHJcbiAqIEBldmVudCBWaWV3cG9ydCNzbmFwLXN0YXJ0XHJcbiAqIEB0eXBlIHtWaWV3cG9ydH1cclxuICovXHJcblxyXG4vKipcclxuICogZmlyZXMgd2hlbiBhIHNuYXAgZW5kc1xyXG4gKiBAZXZlbnQgVmlld3BvcnQjc25hcC1lbmRcclxuICogQHR5cGUge1ZpZXdwb3J0fVxyXG4gKi9cclxuXHJcbi8qKlxyXG4gKiBmaXJlcyB3aGVuIGEgc25hcC16b29tIHN0YXJ0c1xyXG4gKiBAZXZlbnQgVmlld3BvcnQjc25hcC16b29tLXN0YXJ0XHJcbiAqIEB0eXBlIHtWaWV3cG9ydH1cclxuICovXHJcblxyXG4vKipcclxuICogZmlyZXMgd2hlbiBhIHNuYXAtem9vbSBlbmRzXHJcbiAqIEBldmVudCBWaWV3cG9ydCNzbmFwLXpvb20tZW5kXHJcbiAqIEB0eXBlIHtWaWV3cG9ydH1cclxuICovXHJcblxyXG4vKipcclxuICogZmlyZXMgd2hlbiBhIGJvdW5jZSBzdGFydHMgaW4gdGhlIHggZGlyZWN0aW9uXHJcbiAqIEBldmVudCBWaWV3cG9ydCNib3VuY2UteC1zdGFydFxyXG4gKiBAdHlwZSB7Vmlld3BvcnR9XHJcbiAqL1xyXG5cclxuLyoqXHJcbiAqIGZpcmVzIHdoZW4gYSBib3VuY2UgZW5kcyBpbiB0aGUgeCBkaXJlY3Rpb25cclxuICogQGV2ZW50IFZpZXdwb3J0I2JvdW5jZS14LWVuZFxyXG4gKiBAdHlwZSB7Vmlld3BvcnR9XHJcbiAqL1xyXG5cclxuLyoqXHJcbiAqIGZpcmVzIHdoZW4gYSBib3VuY2Ugc3RhcnRzIGluIHRoZSB5IGRpcmVjdGlvblxyXG4gKiBAZXZlbnQgVmlld3BvcnQjYm91bmNlLXktc3RhcnRcclxuICogQHR5cGUge1ZpZXdwb3J0fVxyXG4gKi9cclxuXHJcbi8qKlxyXG4gKiBmaXJlcyB3aGVuIGEgYm91bmNlIGVuZHMgaW4gdGhlIHkgZGlyZWN0aW9uXHJcbiAqIEBldmVudCBWaWV3cG9ydCNib3VuY2UteS1lbmRcclxuICogQHR5cGUge1ZpZXdwb3J0fVxyXG4gKi9cclxuXHJcbi8qKlxyXG4gKiBmaXJlcyB3aGVuIGZvciBhIG1vdXNlIHdoZWVsIGV2ZW50XHJcbiAqIEBldmVudCBWaWV3cG9ydCN3aGVlbFxyXG4gKiBAdHlwZSB7b2JqZWN0fVxyXG4gKiBAcHJvcGVydHkge29iamVjdH0gd2hlZWxcclxuICogQHByb3BlcnR5IHtudW1iZXJ9IHdoZWVsLmR4XHJcbiAqIEBwcm9wZXJ0eSB7bnVtYmVyfSB3aGVlbC5keVxyXG4gKiBAcHJvcGVydHkge251bWJlcn0gd2hlZWwuZHpcclxuICogQHByb3BlcnR5IHtWaWV3cG9ydH0gdmlld3BvcnRcclxuICovXHJcblxyXG4vKipcclxuICogZmlyZXMgd2hlbiBhIHdoZWVsLXNjcm9sbCBvY2N1cnNcclxuICogQGV2ZW50IFZpZXdwb3J0I3doZWVsLXNjcm9sbFxyXG4gKiBAdHlwZSB7Vmlld3BvcnR9XHJcbiAqL1xyXG5cclxuLyoqXHJcbiAqIGZpcmVzIHdoZW4gYSBtb3VzZS1lZGdlIHN0YXJ0cyB0byBzY3JvbGxcclxuICogQGV2ZW50IFZpZXdwb3J0I21vdXNlLWVkZ2Utc3RhcnRcclxuICogQHR5cGUge1ZpZXdwb3J0fVxyXG4gKi9cclxuXHJcbi8qKlxyXG4gKiBmaXJlcyB3aGVuIHRoZSBtb3VzZS1lZGdlIHNjcm9sbGluZyBlbmRzXHJcbiAqIEBldmVudCBWaWV3cG9ydCNtb3VzZS1lZGdlLWVuZFxyXG4gKiBAdHlwZSB7Vmlld3BvcnR9XHJcbiAqL1xyXG5cclxuLyoqXHJcbiAqIGZpcmVzIHdoZW4gdmlld3BvcnQgbW92ZXMgdGhyb3VnaCBVSSBpbnRlcmFjdGlvbiwgZGVjZWxlcmF0aW9uLCBvciBmb2xsb3dcclxuICogQGV2ZW50IFZpZXdwb3J0I21vdmVkXHJcbiAqIEB0eXBlIHtvYmplY3R9XHJcbiAqIEBwcm9wZXJ0eSB7Vmlld3BvcnR9IHZpZXdwb3J0XHJcbiAqIEBwcm9wZXJ0eSB7c3RyaW5nfSB0eXBlIChkcmFnLCBzbmFwLCBwaW5jaCwgZm9sbG93LCBib3VuY2UteCwgYm91bmNlLXksIGNsYW1wLXgsIGNsYW1wLXksIGRlY2VsZXJhdGUsIG1vdXNlLWVkZ2VzLCB3aGVlbClcclxuICovXHJcblxyXG4vKipcclxuICogZmlyZXMgd2hlbiB2aWV3cG9ydCBtb3ZlcyB0aHJvdWdoIFVJIGludGVyYWN0aW9uLCBkZWNlbGVyYXRpb24sIG9yIGZvbGxvd1xyXG4gKiBAZXZlbnQgVmlld3BvcnQjem9vbWVkXHJcbiAqIEB0eXBlIHtvYmplY3R9XHJcbiAqIEBwcm9wZXJ0eSB7Vmlld3BvcnR9IHZpZXdwb3J0XHJcbiAqIEBwcm9wZXJ0eSB7c3RyaW5nfSB0eXBlIChkcmFnLXpvb20sIHBpbmNoLCB3aGVlbCwgY2xhbXAtem9vbSlcclxuICovXHJcblxyXG4vKipcclxuICogZmlyZXMgd2hlbiB2aWV3cG9ydCBzdG9wcyBtb3ZpbmcgZm9yIGFueSByZWFzb25cclxuICogQGV2ZW50IFZpZXdwb3J0I21vdmVkLWVuZFxyXG4gKiBAdHlwZSB7Vmlld3BvcnR9XHJcbiAqL1xyXG5cclxuLyoqXHJcbiAqIGZpcmVzIHdoZW4gdmlld3BvcnQgc3RvcHMgem9vbWluZyBmb3IgYW55IHJhc29uXHJcbiAqIEBldmVudCBWaWV3cG9ydCN6b29tZWQtZW5kXHJcbiAqIEB0eXBlIHtWaWV3cG9ydH1cclxuICovXHJcblxyXG5pZiAodHlwZW9mIFBJWEkgIT09ICd1bmRlZmluZWQnKVxyXG57XHJcbiAgICBpZiAoUElYSS5leHRyYXMpXHJcbiAgICB7XHJcbiAgICAgICAgUElYSS5leHRyYXMuVmlld3BvcnQgPSBWaWV3cG9ydFxyXG4gICAgfVxyXG4gICAgZWxzZVxyXG4gICAge1xyXG4gICAgICAgIFBJWEkuZXh0cmFzID0geyBWaWV3cG9ydCB9XHJcbiAgICB9XHJcbn1cclxuXHJcbm1vZHVsZS5leHBvcnRzID0gVmlld3BvcnQiXX0=