is_sound_allowed = 'true' // set to true to play sounds

let audio = new Audio("/static/img/wheel/tick.mp3"); // Create audio object and load tick.mp3 file.

function ID(id) {
    return document.getElementById(id);
}


const board = ID('roulette-board');
const boardScoresList = ID('roulette-board-scores').querySelector('ul');

const potEl = ID('betting-pot');
const betEl = ID('betting-bet');
const btnClear = ID('btn-clear');

const targets = document.querySelectorAll('.roulette-cell');

const innerRadius = 125;
const outerRadius = 350;

let totalBet = 0;

potEl.querySelector('span').textContent = '120'; // initial pot
betEl.querySelector('span').textContent = '5'; // initial bet

// place a bet by clicking
targets.forEach(cell => {
    cell.addEventListener('click', function() {
        placeBet(cell, parseInt(betEl.textContent));
    })
});


is_betting = false;

function updateRollingDisplay(id, newValue) {

    const container = ID(id);

    if (is_betting) return;

    is_betting = true;

    const currentSpan = container.querySelector('span');
    const newSpan = document.createElement('span');

    // TODO: switch direction depending on newValue compared to old
    newSpan.textContent = newValue;
    newSpan.style.top = '100%';
    newSpan.style.opacity = '0.5';
    newSpan.style.filter = 'blur(2px)';
    container.appendChild(newSpan);

    requestAnimationFrame(() => {
        currentSpan.style.top = '-100%';
        currentSpan.style.opacity = '0.5';
        currentSpan.style.filter = 'blur(2px)';
        newSpan.style.top = '0';
        newSpan.style.opacity = '1';
        newSpan.style.filter = 'blur(0px)';
    });

    setTimeout(() => {
        if (currentSpan && currentSpan.parentElement === container) {
            container.removeChild(currentSpan);
        }
        is_betting = false;
        // container.dataset.animating = 'false';
    }, 400);
}

function changeBet(delta) {

    // adjust the size of the current bet
    let pot = parseInt(potEl.textContent);
    let bet = parseInt(betEl.textContent);

    // only increase the bet if there is enough in the pot
    if (delta > 0 && pot >= delta) {
        bet += delta;
    } else if (delta < 0 && bet > Math.abs(delta)) {
        bet -= Math.abs(delta);
    } else {
        return; // Invalid move
    }

    updateRollingDisplay('betting-bet', bet);

}

function popWinnings(e, rating) {

  const bbox = e.getBoundingClientRect();
  const x = bbox.left + bbox.width / 2;
  const y = bbox.top + bbox.height / 2;

  let effect, amount;

    effect = 'star';
    amount = Math.ceil(Math.pow(rating, 1.2) + 2);

  console.log("Creating stars", amount, effect);

  let i = 0;
  const batchSize = 5; // Number of particles to create per batch

  function createBatch() {
    const end = Math.min(i + batchSize, amount);
    for (; i < end; i++) {
      createParticle(x, y, effect);
    }
    if (i < amount) {
      requestAnimationFrame(createBatch); // Schedule next batch
    }
  }
  createBatch(); // Start the process
};



function changePot(delta){
    // adjust the size of the current pot
    // when bets are placed
    if (delta){
        pot = parseInt(potEl.textContent) + delta;
        updateRollingDisplay('betting-pot', pot);
    }
}


function clearBets(){
    // this will reset the board and the bets
    if (totalBet > 0){
        changePot(totalBet);  // refund any bets placed
    }
    totalBet = 0;
    targets.forEach(cell => {
        cell.classList.remove('bet');
        cell.dataset.betValue = 0;
    })

    // since no bets not spinning
    board.classList.remove("can-spin");
}

function setTheOdds(){
     targets.forEach(cell => {

        cell.dataset.betOdds = 36;
        //2 to 1
        if (
            cell.parentElement.classList.contains('dozen-bets-container') ||
            cell.parentElement.classList.contains('two-to-one-container')
        ) {
            cell.dataset.betOdds = 2;
        }else if (cell.parentElement.classList.contains('other-outside-bets-container')){
            cell.dataset.betOdds = 1;
        }
    })
}

// run at the start to set data values
clearBets();
setTheOdds();

btnClear.addEventListener('click', clearBets)


  let currentTarget = null;
  let ghost;

  // ===== Desktop Drag Events =====
  betEl.addEventListener('dragstart', (e) => {
    const img = new Image();
    img.src = 'https://upload.wikimedia.org/wikipedia/commons/8/89/Gold_coin_icon.png';
    img.onload = () => e.dataTransfer.setDragImage(img, 25, 25);

    e.dataTransfer.setData('text/plain', 'bet');

  });


  targets.forEach(cell => {

    cell.addEventListener('dragover', e => {
        e.preventDefault()
        console.log("dragging over")
    });

    cell.addEventListener('drop', e => {

      e.preventDefault();

      if (currentTarget) {
        currentTarget.classList.remove('betting');
      }

    // this needs to clear out any older bets ..
        placeBet(cell, parseInt(betEl.textContent))
        currentTarget = cell;

    });

  });


  // ===== Mobile Touch Events =====
  let touchGhost = null;

  betEl.addEventListener('touchstart', function(e) {

    e.preventDefault();

    // Create ghost element to simulate drag image
    touchGhost = document.createElement('div');
    touchGhost.className = 'drag-shadow';
    document.body.appendChild(touchGhost);

    // Position it initially
    moveGhost(e.touches[0].clientX, e.touches[0].clientY);

  });

  betEl.addEventListener('touchmove', function(e) {

    moveGhost(e.touches[0].clientX, e.touches[0].clientY);

    // Check what element is under the finger
    const touch = e.touches[0];
    const el = document.elementFromPoint(touch.clientX, touch.clientY);

    if (el && el.classList.contains('roulette-cell')) {

      if (currentTarget && currentTarget !== el) {
        currentTarget.classList.remove('bet');
      }

        el.classList.add('bet');
        currentTarget = el;

    }

  });

  betEl.addEventListener('touchend', function(e) {
    currentTarget = null;

    const touch = e.changedTouches[0];
    const el = document.elementFromPoint(touch.clientX, touch.clientY);

    placeBet(el, parseInt(betEl.textContent))

    if (touchGhost) {
      touchGhost.remove();
      touchGhost = null;
    }
  });

  function moveGhost(x, y) {
    if (!touchGhost) return;
    touchGhost.style.left = (x - 25) + 'px';
    touchGhost.style.top = (y - 25) + 'px';
  }



function placeBet(el, amount){

    if (is_betting) return;

    // add an amount to a specific bet and set some styling
    el.classList.add('bet')
    el.dataset.betValue = parseInt(el.dataset.betValue) + amount;

    totalBet += amount

    // TODO: adjust bet to be a max of total bets and pot


    changePot( amount * -1);
    console.log ("placing bet");
    board.classList.add("can-spin");

}

document.addEventListener('DOMContentLoaded', function() {

    const wheelContainer = document.getElementById('roulette-wheel');

    var wheelSpinning = false;

    // Ball drawing variables
    let ballAngle = 0;
    let isSpinning = false;


    document.getElementById('btn-spin').onclick = spinWheel

        function showWheel(show) {
            wheelContainer.style.opacity = show ? 1 : 0;
            wheelContainer.style.zIndex = show ? 2 : 0;
            board.style.opacity = show ? .2 : 1;
        }

        // show the board first
        showWheel(false);

        // Function to determine the color based on roulette rules
        const GREEN_COLOR = '#10B981';
        const RED_COLOR = '#EF4444';
        const BLACK_COLOR = '#1F2937';

        function getRouletteColor(number) {
            if (number === '0' || number === '00') {
                return GREEN_COLOR;
            }
            const num = parseInt(number, 10);
            if ((1 <= num && num <= 10) || (19 <= num && num <= 28)) {
                return num % 2 === 0 ? BLACK_COLOR : RED_COLOR;
            } else if ((11 <= num && num <= 18) || (29 <= num && num <= 36)) {
                return num % 2 === 0 ? RED_COLOR : BLACK_COLOR;
            }
            return BLACK_COLOR; // Default fallback
        }

        // American roulette wheel number sequence
        const americanRouletteNumbers = [
            '0', '28', '9', '26', '30', '11', '7', '20', '32', '17',
            '5', '22', '34', '15', '3', '24', '36', '13', '1', '00',
            '27', '10', '25', '29', '12', '8', '19', '31', '18', '6',
            '21', '33', '16', '4', '23', '35', '14', '2'
        ];

        const rouletteSegments = americanRouletteNumbers.map(number => {
            color = getRouletteColor(number)
            return {
                fillStyle: color,
                originalFillStyle: color,  // Store original
                text: number,
                textFillStyle: 'white',
                textAlignment: 'outer',
                textFontSize: 20,
                value: parseInt(number,10) === 0 ? 37 : parseInt(number, 10)
            };
        });

        // Initialize the Winwheel with the roulette configuration
        const wheel = new Winwheel({
            numSegments: rouletteSegments.length,
            segments: Array.from(rouletteSegments),
            textFontSize: 20,
              background:'white',
            outerRadius: outerRadius,
            innerRadius: innerRadius,
            responsive: true,
            animation: {
                callbackFinished: function(){
                    alert ("Done")
                },
                callbackAfter: function(){
                    console.log("ticked")
                },
                // afterDraw:drawBall,
                // type: 'spinToStop',
                duration: 10,
                spins: 2,
                easing: 'Power4.easeOut',
                // stopAngle: null,
                // direction: 'clockwise',
                // repeat: 0,
                // yoyo: false,
                // callbackSound: playSound,
                // soundTrigger: 'pin'
            },
            pins: {
                number: 38,
                responsive: true,
                outerRadius: 4
            }
        });


        function resetWheel() {

            if (wheelSpinning) return;

            // wheel.stopAnimation(false);

            // give the wheel a random angle to start with
            wheel.rotationAngle = parseInt(Math.random() * 360);

            // Reset all segments to original colors
            wheel.segments.slice(1).forEach(segment => {
                if (segment)
                    segment.fillStyle = segment.originalFillStyle;
                    segment.textFillStyle = 'white';
                    segment.textFontSize = 20;
            });

            // Clear previous text from the middle
            const ctx = wheel.canvas.getContext("2d");
            ctx.clearRect(0, 0, wheel.canvas.width, wheel.canvas.height);

            wheel.draw(false);

            // Reset ball
            ballAngle = 0;
            // drawBall(ballAngle, 0);
            wheelSpinning = false;
            // reset the board
            clearBoard();

        };

        resetWheel();

        function highlightSegment(segment) {
            if (segment) {
                segment.fillStyle = 'yellow';
                segment.textFillStyle = 'black',
                // consider more visuals like background color
                segment.textFontSize = 42
            }
            wheel.draw(false); // Apply the highlight
            drawBall(ballAngle, 1);
        }

        function clearBoard(){
            board.querySelectorAll('.roulette-cell').forEach(cell => {
                cell.classList.remove('win');
                // cell.dataset.betValue = 0
            });
        };


        function calcBetWin(cell){
            // work out if someone bet on this winning cell
            // return their total winnings
            cell.classList.add('win');
            if (cell.classList.contains('bet')){
                winnings = (parseInt(cell.dataset.betOdds) +1) * parseInt(cell.dataset.betValue)
                popWinnings(cell, winnings)
                return winnings
            }else{
                return 0;
            };
        };


        function highlightBoard(segment) {

            // show which cells are winners
            winnings = 0

            cell = board.querySelector(`[data-value="${segment.text}"]`)
            cell.classList.add('win');

            // calc red/black wins
            if (segment.originalFillStyle== '#EF4444'){
                cell = board.querySelector(`[data-value="Red"]`)
                winnings+= calcBetWin(cell);
            } else if (segment.originalFillStyle == '#1F2937') {
                cell = board.querySelector(`[data-value="Black"]`)
                winnings+= calcBetWin(cell);
            }

            num = segment.value

            if (num <= 36){

                // Evens / Odds
                evenOdd =  (num % 2 === 0) ? 'Even': 'Odd'
                cell = board.querySelector(`[data-value="${evenOdd}"]`)
                winnings+= calcBetWin(cell);

                // Half-Boards
                evenOdd = (num < 19) ? '1-18':'19-36'
                cell = board.querySelector(`[data-value="${evenOdd}"]`)
                winnings+= calcBetWin(cell);

                // Third-Boards
                if (num < 13) {
                    cell = board.querySelector(`[data-value="1st 12"]`)
                    winnings+= calcBetWin(cell);
                } else if  (num < 25) {
                    cell = board.querySelector(`[data-value="2nd 12"]`)
                    winnings+= calcBetWin(cell);
                }else{
                    cell = board.querySelector(`[data-value="3rd 12"]`)
                    winnings+= calcBetWin(cell);
                }
            }

            setTimeout(() => {

                totalBet = 0;

                const newLi = document.createElement("li");
                newLi.textContent = segment.text;
                newLi.style.backgroundColor = segment.originalFillStyle;
                boardScoresList.prepend(newLi);

                setTimeout(() => {

                    is_betting = false;
                    changePot(winnings);
                    clearBoard();
                    clearBets();

                }, 1750)

            },1000)

        }


        
        var n_turns;

        function spinWheel() {

            if (wheelSpinning) return;

            is_betting = true;
            resetWheel();
            showWheel(true);

            wheelSpinning = true;
            n_turns = 3 + Math.random() *2

            ballAnimationTime = wheel.animation.duration * (1 - Math.random() * 0.5);
            animateBall(ballAnimationTime, null);
            // wheel.startAnimation();

        }


        function determineBallSegment(ballAngle) {

            // Final angles
            const wheelAngle = wheel.rotationAngle % 360;

            const ballFinalAngle = (360 - (ballAngle % 360)) % 360; // Normalize to 0–360

            // Combine angles to get effective angle
            const effectiveAngle = (ballFinalAngle + wheelAngle ) % 360;

            console.log("Ball angle:", ballAngle, "Wheel angle:", wheelAngle, "Final ball angle:", ballFinalAngle);
            console.log("Effective angle:", effectiveAngle);

            // Find segment
            const segments = wheel.segments.slice(1);
            const anglePerSegment = 360 / segments.length;

            const index = Math.floor(effectiveAngle / anglePerSegment) + 1;

            const selectedSegment = segments[segments.length - index]  ;

            console.log("Selected segment index:", index, "Angle:", effectiveAngle);

            drawBall(ballAngle, 1)

            console.log("Ball landed on:", selectedSegment.text, ballAngle);

            // Display the result text in the center of the canvas
                const ctx = wheel.canvas.getContext("2d");

                // Clear previous text
                ctx.clearRect(0, 0, wheel.canvas.width, wheel.canvas.height);

                // Set font and alignment
                ctx.font = "bold 56px 'Segoe UI', sans-serif";  // Choose a nice readable font
                ctx.fillStyle = selectedSegment.fillStyle || "#000";  // Use segment color or fallback to black
                ctx.textAlign = "center";
                ctx.textBaseline = "middle";

                // Draw text in center
                ctx.fillText(
                    selectedSegment.text,
                    wheel.canvas.width / 2,
                    wheel.canvas.height / 2
                );

            return selectedSegment;

            // You could display this in the UI or highlight it.
        }


        // BALL
        function drawBall(angle, progress) {

            const ctx = wheel.ctx;

            inner = wheel.innerRadius + 8
            outer = wheel.outerRadius - 16

            const r = (outer) - (progress *(outer - inner)); // slightly inside the edge

            const x = wheel.centerX + r * Math.cos(angle);
            const y = wheel.centerY + r * Math.sin(angle);

            // console.log('drawing ball',x,y)

            wheel.rotationAngle = n_turns * 360 * progress;

            wheel.draw(false); // Redraw without re-animating

            // Draw ball
            ctx.save();
            ctx.beginPath();
            ctx.arc(x, y, 8, 0, 2 * Math.PI);
            ctx.fillStyle = 'silver';
            ctx.fill();
            ctx.strokeStyle = '#aaa';
            ctx.stroke();
            ctx.restore();

        }


        function easeOutQuart(t) {
            return 1 - Math.pow(1 - t, 4);
        }


        function animateBall(durationSeconds, onComplete) {

            console.log("starting ball animation")
            const startTime = performance.now();

            const totalRotation = (-4 * Math.PI) *( 1 + Math.random()); // 2 full CCW spins

            const initialAngle = 0;
            var last_segment = -1;

            function bounceEaseOut(t) {

                return 1 - Math.pow(1 - t, 3); // cubic ease out
                // A simple bounce easing: fast -> slow -> overshoot -> settle
                if (t < 0.8) {
                    return 1 - Math.pow(1 - t, 3); // cubic ease out
                } else {
                    const overshoot = (t - 0.8) / 0.2; // normalize last 20%
                    return 1 - 0.05 * Math.sin(overshoot * Math.PI * 3); // bounce
                }
            }

            function frame(now) {

                const elapsed = now - startTime;
                const progress = Math.min(elapsed / (durationSeconds * 1000), 1);

                const easedProgress = bounceEaseOut(progress);

                ballAngle = initialAngle + totalRotation * easedProgress;

                const ballAngleDegrees = (ballAngle * 180) / Math.PI

                // calculate the degrees in a segment
                const segmentDegrees = parseInt(360 / wheel.segments.length -1);

                segment = Math.floor((ballAngleDegrees + 90) / segmentDegrees) % wheel.segments.length;
                // we only want to play the sound if the ball has passed a segment
                console.log(segment)
                if (segment != last_segment){
                    playSound();
                }
                last_segment = segment;

                drawBall(ballAngle, easedProgress);

                // console.log("Ball animation angle:", ballAngle, ballAngleDegrees,  initialAngle , totalRotation , easedProgress);

                if (progress < 1) {
                    requestAnimationFrame(frame);
                } else {

                    console.log("Ball animation completed", ballAngleDegrees);
                    const finalSegment = determineBallSegment(ballAngleDegrees + 90 );

                    console.log("FINAL SEGEMENT", finalSegment)

                    wheelSpinning = false;

                    highlightSegment(finalSegment);

                    showWheel(false);

                    highlightBoard(finalSegment);

                }
            }

            requestAnimationFrame(frame);

        }

    });


    function playSound() {
        if (is_sound_allowed == "true") {
            // Stop and rewind the sound if it already happens to be playing.
            audio.pause();
            audio.currentTime = 0;
            audio.play();
        }
    }