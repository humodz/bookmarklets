javascript:
void (function () {
  var frameRate = 30;
  var dt = 1.0 / frameRate;
  var DEG_TO_RAD = Math.PI / 180;
  var RAD_TO_DEG = 180 / Math.PI;
  var colors = [
	  ["#df0049", "#660671"],
	  ["#00e857", "#005291"],
	  ["#2bebbc", "#05798a"],
	  ["#ffd200", "#b06c00"]
  ];

  class Vector2 {
    constructor(x, y) {
      this.x = x;
      this.y = y;
    }
  }

	function ConfettiPaper(_x, _y) {
		this.dead = false;
		this.pos = new Vector2(_x, _y);
		this.rotationSpeed = Math.random() * 600 + 800;
		this.angle = DEG_TO_RAD * Math.random() * 360;
		this.rotation = DEG_TO_RAD * Math.random() * 360;
		this.cosA = 1.0;
		this.size = 5.0;
		this.oscillationSpeed = Math.random() * 1.5 + 0.5;
		this.xSpeed = 40.0;
		this.ySpeed = Math.random() * 80 + 50.0;
		this.corners = new Array();
		this.time = Math.random();
		var ci = Math.round(Math.random() * (colors.length - 1));
		this.frontColor = colors[ci][0];
		this.backColor = colors[ci][1];

		for (var i = 0; i < 4; i++) {
			var dx = Math.cos(this.angle + DEG_TO_RAD * (i * 90 + 45));
			var dy = Math.sin(this.angle + DEG_TO_RAD * (i * 90 + 45));
			this.corners[i] = new Vector2(dx, dy);
		}
		this.Update = function (_dt) {
			this.time += _dt;
			this.rotation += this.rotationSpeed * _dt;
			this.cosA = Math.cos(DEG_TO_RAD * this.rotation);
			this.pos.x += Math.cos(this.time * this.oscillationSpeed) * this.xSpeed * _dt;
			this.pos.y += this.ySpeed * _dt;
			if (this.pos.y > ConfettiPaper.bounds.y) {
				this.dead = true;
			}
		};
		this.Draw = function (_g) {
			if (this.cosA > 0) {
				_g.fillStyle = this.frontColor;
			} else {
				_g.fillStyle = this.backColor;
			}
			_g.beginPath();
			_g.moveTo(this.pos.x + this.corners[0].x * this.size, this.pos.y + this.corners[0].y * this.size * this.cosA);
			for (var i = 1; i < 4; i++) {
				_g.lineTo(this.pos.x + this.corners[i].x * this.size, this.pos.y + this.corners[i].y * this.size * this.cosA);
			}
			_g.closePath();
			_g.fill();
		};

	}
	ConfettiPaper.bounds = new Vector2(0, 0);

	ConfettiMachine = function(parent) {
		var i = 0;
		var canvasParent = document.querySelector(parent);
		var canvas = document.createElement('canvas');
		canvas.width = canvasParent.offsetWidth;
		canvas.height = canvasParent.offsetHeight;
		canvas.style.pointerEvents = 'none';
		canvas.style.position = 'absolute';
		canvas.style.top = 0;
		canvas.style.left = 0;
		canvas.style.zIndex = 9999;
		canvasParent.appendChild(canvas);
		var context = canvas.getContext('2d');
		var interval = null;

		canvas.style.transition = 'opacity 5s ease';
		canvas.style.position = 'fixed';

		var confettiPaperCount = 150;
		var confettiPapers = new Array();
    this.destroy = function() {
      canvas.style.opacity = '0';
      setTimeout(() => {
        this.stop();
        canvasParent.removeChild(canvas);
      }, 5000);
    };
		this.pop = function() {
			ConfettiPaper.bounds = new Vector2(canvas.width, canvas.height);
			for (i = 0; i < confettiPaperCount; i++) {
				confettiPapers.push(new ConfettiPaper(Math.random() * canvas.width, Math.random() * (-50)));
			}
			this.start();
		};
		this.start = function() {
			this.stop();
			var context = this;

			this.update();

			this.interval = setInterval(function () {
				context.update();
			}, 1000.0 / frameRate);
		};
		this.stop = function() {
			clearInterval(this.interval);
		};
		this.update = function() {
			var i = 0;
			context.clearRect(0, 0, canvas.width, canvas.height);
			for (i = 0; i < confettiPapers.length; i++) {
				confettiPapers[i].Update(dt);
				confettiPapers[i].Draw(context);
				if(confettiPapers[i].dead == true){
					confettiPapers.splice(i, 1);
				}
			}
			if(confettiPapers.length == 0){
				this.stop();
			}
		};
	};

	const confetti = new ConfettiMachine('body');
  confetti.pop();
  setTimeout(() => {
    confetti.destroy();
  }, 10000);
}());
