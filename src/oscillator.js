define(function (require) {
  'use strict';

  var p5sound = require('master');
  var Signal = require('Tone/signal/Signal');
  var Add = require('Tone/signal/Add');
  var Mult = require('Tone/signal/Multiply');
  var Scale = require('Tone/signal/Scale');

  /**
   *  <p>Creates a signal that oscillates between -1.0 and 1.0.
   *  By default, the oscillation takes the form of a sinusoidal
   *  shape ('sine'). Additional types include 'triangle',
   *  'sawtooth' and 'square'. The frequency defaults to
   *  440 oscillations per second (440Hz, equal to the pitch of an
   *  'A' note).</p> 
   *
   *  <p>Set the type of oscillation with setType(), or by creating a
   *  specific oscillator.</p> For example:
   *  <code>new p5.SinOsc(freq)</code>
   *  <code>new p5.TriOsc(freq)</code>
   *  <code>new p5.SqrOsc(freq)</code>
   *  <code>new p5.SawOsc(freq)</code>.
   *  </p>
   *  
   *  @class p5.Oscillator
   *  @constructor
   *  @param {Number} [freq] frequency defaults to 440Hz
   *  @param {String} [type] type of oscillator. Options:
   *                         'sine' (default), 'triangle',
   *                         'sawtooth', 'square'
   *  @return {Object}    Oscillator object
   */
  p5.Oscillator = function(freq, type){
    if (typeof(freq) === 'string') {
      var f = type;
      type = freq;
      freq = f;
    } if (typeof(type) === 'number') {
      var f = type;
      type = freq;
      freq = f;
    }
    this.started = false;

    // components
    this.oscillator = p5sound.audiocontext.createOscillator();
    this.f = freq || 440.0; // frequency
    this.oscillator.frequency.setValueAtTime(this.f, p5sound.audiocontext.currentTime);
    this.oscillator.type = type || 'sine';
    var o = this.oscillator;

    // connections
    this.input = p5sound.audiocontext.createGain();
    this.output = p5sound.audiocontext.createGain();

    this._freqMods = []; // modulators connected to this oscillator's frequency

    // set default output gain
    this.output.gain.value = 0.0;
    this.output.gain.setValueAtTime(0.0, p5sound.audiocontext.currentTime);

    this.oscillator.connect(this.output);
    // stereo panning
    this.panPosition = 0.0;
    this.panner = new p5.Panner(this.output, p5sound.input);
    this.connection = p5sound.input; // connect to p5sound by default

    //array of math operation signal chaining
    this.mathOps = [this.output];

    // add to the soundArray so we can dispose of the osc later
    p5sound.soundArray.push(this);
  };

  /**
   *  Start an oscillator. Accepts an optional parameter to
   *  determine how long (in seconds from now) until the
   *  oscillator starts.
   *
   *  @method  start
   *  @param  {Number} [time] startTime in seconds from now.
   *  @param  {Number} [frequency] frequency in Hz.
   */
  p5.Oscillator.prototype.start = function(time, f) {
    if (this.started){
      var now = p5sound.audiocontext.currentTime;
      this.stop(now);
    }
    if (!this.started){
      var freq = f || this.f;
      var type = this.oscillator.type;
      // var detune = this.oscillator.frequency.value;
      this.oscillator = p5sound.audiocontext.createOscillator();
      this.oscillator.frequency.exponentialRampToValueAtTime(Math.abs(freq), p5sound.audiocontext.currentTime);
      this.oscillator.type = type;
      // this.oscillator.detune.value = detune;
      this.oscillator.connect(this.output);
      time = time || 0;
      this.oscillator.start(time + p5sound.audiocontext.currentTime);
      this.freqNode = this.oscillator.frequency;

      // if other oscillators are already connected to this osc's freq
      for (var i in this._freqMods) {
        if (typeof this._freqMods[i].connect !== 'undefined') {
          this._freqMods[i].connect(this.oscillator.frequency);
        }
      }

      this.started = true;
    }
  };

  /**
   *  Stop an oscillator. Accepts an optional parameter
   *  to determine how long (in seconds from now) until the
   *  oscillator stops.
   *
   *  @method  stop
   *  @param  {Number} secondsFromNow Time, in seconds from now.
   */
  p5.Oscillator.prototype.stop = function(time){
    if (this.started){
      var t = time || 0;
      var now = p5sound.audiocontext.currentTime;
      this.oscillator.stop(t + now);
      this.started = false;
    }
  };

  /**
   *  Set amplitude (volume) of an oscillator between 0 and 1.0
   *
   *  @method  amp
   *  @param  {Number} vol between 0 and 1.0
   *  @param {Number} [rampTime] create a fade that lasts rampTime 
   *  @param {Number} [timeFromNow] schedule this event to happen
   *                                seconds from now
   *  @return  {AudioParam} gain  If no value is provided,
   *                              returns the Web Audio API
   *                              AudioParam that controls
   *                              this oscillator's
   *                              gain/amplitude/volume)
   */
  p5.Oscillator.prototype.amp = function(vol, rampTime, tFromNow){
    if (typeof(vol) === 'number') {
      var rampTime = rampTime || 0;
      var tFromNow = tFromNow || 0;
      var now = p5sound.audiocontext.currentTime;
      var currentVol = this.output.gain.value;
      this.output.gain.cancelScheduledValues(now);
      this.output.gain.linearRampToValueAtTime(currentVol, now + tFromNow);
      this.output.gain.linearRampToValueAtTime(vol, now + tFromNow + rampTime);
    }
    else if (vol) {
      vol.connect(this.output.gain);
    } else {
      // return the Gain Node
      return this.output.gain;
    }
  };

  // these are now the same thing
  p5.Oscillator.prototype.fade =   p5.Oscillator.prototype.amp;

  p5.Oscillator.prototype.getAmp = function(){
    return this.output.gain.value;
  };

  /**
   *  Set frequency of an oscillator.
   *
   *  @method  freq
   *  @param  {Number} Frequency Frequency in Hz
   *  @param  {Number} [rampTime] Ramp time (in seconds)
   *  @param  {Number} [timeFromNow] Schedule this event to happen
   *                                   at x seconds from now
   *  @return  {AudioParam} Frequency If no value is provided,
   *                                  returns the Web Audio API
   *                                  AudioParam that controls
   *                                  this oscillator's frequency
   *  @example
   *  <div><code>
   *  var osc = new p5.Oscillator(300);
   *  osc.start();
   *  osc.freq(40, 10);
   *  </code></div>
   */
  p5.Oscillator.prototype.freq = function(val, rampTime, tFromNow){
    if (typeof(val) === 'number') {
      this.f = val;
      var now = p5sound.audiocontext.currentTime;
      var rampTime = rampTime || 0;
      var tFromNow = tFromNow || 0;
      var currentFreq = this.oscillator.frequency.value;
      this.oscillator.frequency.cancelScheduledValues(now);
      this.oscillator.frequency.setValueAtTime(currentFreq, now + tFromNow);
      if (val > 0 ){
        this.oscillator.frequency.exponentialRampToValueAtTime(val, tFromNow + rampTime + now);
      } else {
        this.oscillator.frequency.linearRampToValueAtTime(val, tFromNow + rampTime + now);
      }
    } else if (val) {
      val.connect(this.oscillator.frequency);

      // keep track of what is modulating this param
      // so it can be re-connected if 
      this._freqMods.push( val );
    } else {
      // return the Frequency Node
      return this.oscillator.frequency;
    }
  };

  p5.Oscillator.prototype.getFreq = function(){
    return this.oscillator.frequency.value;
  };

  /**
   *  Set type to 'sine', 'triangle', 'sawtooth' or 'square'.
   *
   *  @method  setType
   *  @param {String} type 'sine', 'triangle', 'sawtooth' or 'square'.
   */
  p5.Oscillator.prototype.setType = function(type){
    this.oscillator.type = type;
  };

  p5.Oscillator.prototype.getType = function(){
    return this.oscillator.type;
  };

  /**
   *  Connect to a p5.sound / Web Audio object.
   *
   *  @method  connect
   *  @param  {Object} unit A p5.sound or Web Audio object
   */
  p5.Oscillator.prototype.connect = function(unit){
    if (!unit) {
       this.panner.connect(p5sound.input);
    }
    else if (unit.hasOwnProperty('input')){
      this.panner.connect(unit.input);
      this.connection = unit.input;
      }
    else {
      this.panner.connect(unit);
      this.connection = unit;
    }
  };

  /**
   *  Disconnect all outputs
   *
   *  @method  disconnect
   */
  p5.Oscillator.prototype.disconnect = function(unit){
    // disconnect from specific mods
    this.panner.disconnect(unit);
    this.oscMods = [];
  };

  /**
   *  Pan between Left (-1) and Right (1)
   *
   *  @method  pan
   *  @param  {Number} panning Number between -1 and 1
   */
  p5.Oscillator.prototype.pan = function(pval) {
    this.panPosition = pval;
    this.panner.pan(pval);
  };

  p5.Oscillator.prototype.getPan = function() {
    return this.panPosition;
  };

  // get rid of the oscillator
  p5.Oscillator.prototype.dispose = function() {
    if (this.oscillator){
      var now = p5sound.audiocontext.currentTime;
      this.stop(now);
      this.disconnect();
      this.oscillator.disconnect();
      this.panner = null;
      this.oscillator = null;
    }
    // if it is a Pulse
    if (this.osc2) {
      this.osc2.dispose();
    }
  };

  /**
   *  Set the phase of an oscillator between 0.0 and 1.0
   *  
   *  @method  phase
   *  @param  {Number} phase float between 0.0 and 1.0
   */
  p5.Oscillator.prototype.phase = function(p){
    if (!this.dNode) {
      // create a delay node
      this.dNode = p5sound.audiocontext.createDelay();
      // put the delay node in between output and panner
      this.output.disconnect();
      this.output.connect(this.dNode);
      this.dNode.connect(this.panner);
    }
    // set delay time based on PWM width
    var now = p5sound.audiocontext.currentTime;
    this.dNode.delayTime.linearRampToValueAtTime( p5.prototype.map(p, 0, 1.0, 0, 1/this.oscillator.frequency.value), now);
  };

  // ========================== //
  // SIGNAL MATH FOR MODULATION //
  // ========================== //

  /**
   *  Add a value to the p5.Oscillator's output amplitude,
   *  and return the oscillator. Calling this method again
   *  will override the initial add() with a new value.
   *  
   *  @method  add
   *  @param {Number} number Constant number to add
   *  @return {p5.Oscillator} Oscillator Returns this oscillator
   *                                     with scaled output
   *  
   */
  p5.Oscillator.prototype.add = function(num) {
    var add = new Add(num);
    var thisChain = this.mathOps.length;
    var nextChain = this.panner;
    return p5.prototype._mathChain(this, add, thisChain, nextChain, Add);
  };

  /**
   *  Multiply the p5.Oscillator's output amplitude
   *  by a fixed value (i.e. turn it up!). Calling this method
   *  again will override the initial mult() with a new value.
   *  
   *  @method  mult
   *  @param {Number} number Constant number to multiply
   *  @return {p5.Oscillator} Oscillator Returns this oscillator
   *                                     with multiplied output
   */
  p5.Oscillator.prototype.mult = function(num) {
    var mult = new Mult(num);
    var thisChain = this.mathOps.length;
    var nextChain = this.panner;
    return p5.prototype._mathChain(this, mult, thisChain, nextChain, Mult);
  };

  /**
   *  Scale this oscillator's amplitude values to a given
   *  range, and return the oscillator. Calling this method
   *  again will override the initial scale() with new values.
   *  
   *  @method  scale
   *  @param  {Number} inMin  input range minumum
   *  @param  {Number} inMax  input range maximum
   *  @param  {Number} outMin input range minumum
   *  @param  {Number} outMax input range maximum
   *  @return {p5.Oscillator} Oscillator Returns this oscillator
   *                                     with scaled output
   */
  p5.Oscillator.prototype.scale = function(inMin, inMax, outMin, outMax) {
    var scale = new Scale(inMin, inMax, outMin, outMax);
    var thisChain = this.mathOps.length;
    var nextChain = this.panner;
    return p5.prototype._mathChain(this, scale, thisChain, nextChain, Scale);
  };

  // ============================== //
  // SinOsc, TriOsc, SqrOsc, SawOsc //
  // ============================== //

  /**
   *  Constructor: <code>new p5.SinOsc()</code>.
   *  This creates a Sine Wave Oscillator and is
   *  equivalent to <code> new p5.Oscillator('sine')
   *  </code> or creating a p5.Oscillator and then calling
   *  its method <code>setType('sine')</code>.
   *  See p5.Oscillator for methods.
   *
   *  @method  p5.SinOsc
   *  @param {[Number]} freq Set the frequency
   */
  p5.SinOsc = function(freq) {
    p5.Oscillator.call(this, freq, 'sine');
  };

  p5.SinOsc.prototype = Object.create(p5.Oscillator.prototype);

  /**
   *  Constructor: <code>new p5.TriOsc()</code>.
   *  This creates a Triangle Wave Oscillator and is
   *  equivalent to <code>new p5.Oscillator('triangle')
   *  </code> or creating a p5.Oscillator and then calling
   *  its method <code>setType('triangle')</code>.
   *  See p5.Oscillator for methods.
   *
   *  @method  p5.TriOsc
   *  @param {[Number]} freq Set the frequency
   */
  p5.TriOsc = function(freq) {
    p5.Oscillator.call(this, freq, 'triangle');
  };

  p5.TriOsc.prototype = Object.create(p5.Oscillator.prototype);

  /**
   *  Constructor: <code>new p5.SawOsc()</code>.
   *  This creates a SawTooth Wave Oscillator and is
   *  equivalent to <code> new p5.Oscillator('sawtooth')
   *  </code> or creating a p5.Oscillator and then calling
   *  its method <code>setType('sawtooth')</code>.
   *  See p5.Oscillator for methods.
   *
   *  @method  p5.SawOsc
   *  @param {[Number]} freq Set the frequency
   */
  p5.SawOsc = function(freq) {
    p5.Oscillator.call(this, freq, 'sawtooth');
  };

  p5.SawOsc.prototype = Object.create(p5.Oscillator.prototype);

  /**
   *  Constructor: <code>new p5.SqrOsc()</code>.
   *  This creates a Square Wave Oscillator and is
   *  equivalent to <code> new p5.Oscillator('square')
   *  </code> or creating a p5.Oscillator and then calling
   *  its method <code>setType('square')</code>.
   *  See p5.Oscillator for methods.
   *
   *  @method  p5.SawOsc
   *  @param {[Number]} freq Set the frequency
   */
  p5.SqrOsc = function(freq) {
    p5.Oscillator.call(this, freq, 'square');
  };

  p5.SqrOsc.prototype = Object.create(p5.Oscillator.prototype);

});