function ID(id) {
    return document.getElementById(id);
}

let audio = new Audio("/static/img/wheel/tick.mp3"); // Create audio object and load tick.mp3 file.

// global variable to control sound:
// TODO: needs to be fixed ..
is_sound_allowed = "true"; 


// TODO: this needs to be generic: load(name, file), play(name, volume) methods 
// and should allow for overlapping sounds ?

function playSound() {
    if (is_sound_allowed == "true") {
        // Stop and rewind the sound if it already happens to be playing.
        audio.pause();
        audio.volume = .1;
        audio.currentTime = 0;
        audio.play();
    }
}

function popWinnings(e, rating) {

    // get middle of the element where the stars will go
    const bbox = e.getBoundingClientRect();
    const x = bbox.left + bbox.width / 2;
    const y = bbox.top + bbox.height / 2;

    let effect = 'star';
    let amount = Math.min(Math.ceil(Math.pow(rating, 1.2) + 2) , 50);

    // console.log("Creating stars", amount, effect);
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


// END of HELPER FUNCTIONS

/**
 * @class RouletteGame
 * @description Represents a roulette game with betting, spinning, and winning logic.
 * 
 * This class handles the entire roulette game logic, including:
 * - Managing the roulette board and wheel.
 * - Placing and clearing bets.
 * - Calculating winnings based on bets and outcomes.
 * - Animating the roulette wheel and ball.
 * - Tracking the player's pot and spins.
 * 
 * @property {string[]} americanRouletteNumbers - The numbers on an American roulette wheel.
 * @property {string} GREEN_COLOR - The color for green segments (0 and 00).
 * @property {string} RED_COLOR - The color for red segments.
 * @property {string} BLACK_COLOR - The color for black segments.
 * @property {number} _spins - The initial number of spins available to the player.
 * @property {number} _pot_value - The current value of the player's pot.

 * @property {number} innerRadius - The inner radius of the roulette wheel.
 * @property {number} outerRadius - The outer radius of the roulette wheel.
 * @property {number} totalBet - The total amount of bets placed.
 * @property {boolean} is_betting - Indicates if the player is currently betting.
 * @property {boolean} is_wheel_spinning - Indicates if the roulette wheel is spinning.
 * @property {number} ballAngle - The current angle of the ball on the wheel.
 * @property {HTMLElement} board - The DOM element representing the roulette board.
 * @property {HTMLElement} boardScoresList - The DOM element for displaying scores.
 * @property {NodeList} targets - The DOM elements representing bettable cells on the board.
 * @property {HTMLElement} wheelContainer - The DOM element containing the roulette wheel.
 * @property {Object[]} rouletteSegments - The segments of the roulette wheel, including their colors and values.
 * @property {Winwheel} wheel - The Winwheel instance representing the roulette wheel.
 * 
 * @constructor
 * @description Initializes the roulette game, sets up the board, wheel, and event listeners.
 * 
 * @method get pot() - Gets the current pot value.
 * @method set pot(value) - Sets the pot value and updates the display.
 * @method _setTheOdds() - Sets the odds for each bettable cell on the board.
 * @method getRouletteColor(number) - Determines the color of a given roulette number.
 * @method updateRollingDisplay(id, newValue) - Animates the update of a rolling display element.
 * @method changePot(delta) - Adjusts the pot value by a given delta.
 * @method clearBets() - Clears all bets and refunds the total bet amount to the pot.
 * @method placeBet(el, amount) - Places a bet on a specific cell with a given amount.
 * @method clearBoard() - Resets the board, removing all winning highlights.
 * @method calcBetWin(cell, isFinal) - Calculates the winnings for a specific bet cell.
 * @method highlightBoard(segment) - Highlights the winning cells on the board based on the winning segment.
 * @method calculateWinnings(segment, isFinal) - Calculates the total winnings based on the winning segment.
 * @method checkGameOver() - Checks if the game is over (pot or spins depleted).
 * @method showWheel(show) - Toggles the visibility of the roulette wheel.
 * @method resetWheel() - Resets the wheel to its initial state.
 * @method highlightSegment(segment) - Highlights a specific segment on the wheel.
 * @method spinWheel() - Initiates the spinning of the roulette wheel and ball.
 * @method determineBallSegment(ballAngle) - Determines the segment where the ball lands.
 * @method drawBall(angle, progress) - Draws the ball on the wheel at a specific angle and progress.
 * @method easeOutQuart(t) - Easing function for smooth animations.
 * @method animateBall(durationSeconds, onComplete) - Animates the ball spinning on the wheel.
 * @method calcBetEfficiency() - Calculates the efficiency of the bets placed.
 */

class RouletteGame {

    americanRouletteNumbers = [
        '0', '28', '9', '26', '30', '11', '7', '20', '32', '17',
        '5', '22', '34', '15', '3', '24', '36', '13', '1', '00',
        '27', '10', '25', '29', '12', '8', '19', '31', '18', '6',
        '21', '33', '16', '4', '23', '35', '14', '2'
    ];

    GREEN_COLOR = '#10B981';
    RED_COLOR = '#EF4444';
    BLACK_COLOR = '#1F2937';

    _spins = 5;

    _pot_value = 100;

    innerRadius = 125;
    outerRadius = 350;

    totalBet = 0;

    is_betting = false;
    is_wheel_spinning = false;
    ballAngle = 0;

    get spins(){
        return this._spins
    }

    set spins(value){
        this._spins = value;
        this.updateRollingDisplay('spins', value);
    }

    get pot(){
        return this._pot_value
    }

    set pot(value){
        this._pot_value = value;
        this.updateRollingDisplay('betting-pot', value);
    }

    constructor() {

        this.board = ID('roulette-board');
        this.boardScoresList = ID('roulette-board-scores').querySelector('ul');
        this.targets = document.querySelectorAll('.roulette-cell');
        this.wheelContainer = ID('roulette-wheel');


        this.pot = 100;        
        this.spins = 6

        this.is_betting = false;

        ID('btn-clear').onclick = () => this.clearBets();
        ID('btn-spin').onclick = () => this.spinWheel();


        this._setTheOdds();
        this.clearBets();
        this.clearBoard();
                

        setTimeout(() => {
            this.showWheel(false);
        },250)

    }

    // Set the odds for target each bet
     _setTheOdds(){
        this.targets.forEach(cell => {
            cell.dataset.betOdds = 36;

            //2 to 1 and 3 to 1
            if (
                cell.parentElement.classList.contains('dozen-bets-container') ||
                cell.parentElement.classList.contains('two-to-one-column')
            ) {
                cell.dataset.betOdds = 2;
            }else if (cell.parentElement.classList.contains('other-outside-bets-container')){
                cell.dataset.betOdds = 1;
            }

        })

    }


    getRouletteColor(number) {
        if (number === '0' || number === '00') {
            return this.GREEN_COLOR;
        }
        const num = parseInt(number, 10);
        if ((1 <= num && num <= 10) || (19 <= num && num <= 28)) {
            return num % 2 === 0 ? this.BLACK_COLOR : this.RED_COLOR;
        } else if ((11 <= num && num <= 18) || (29 <= num && num <= 36)) {
            return num % 2 === 0 ? this.RED_COLOR : this.BLACK_COLOR;
        }
        return this.BLACK_COLOR; // Default fallback
    }


    // # TODO we need an updating status per item
    updateRollingDisplay(id, newValue) {

        // if (this.is_betting) return;

        const container = ID(id);

        this.is_betting = true;

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
            newSpan.style.top = '.2em';
            newSpan.style.opacity = '1';
            newSpan.style.filter = 'blur(0px)';
        });

        setTimeout(() => {
            if (currentSpan && currentSpan.parentElement === container) {
                container.removeChild(currentSpan);
            }
            this.is_betting = false;
            // container.dataset.animating = 'false';
        }, 400);
    }


    // BETTING

    // changeBet(delta) {
    //     // adjust the size of the current bet up or down
    //     // only increase the bet if there is enough in the pot
    //     if (delta > 0 && this.pot >= delta) {
    //         this.bet += delta;
    //     } else if (delta < 0 && this.bet > Math.abs(delta)) {
    //         this.bet -= Math.abs(delta);
    //     } else {
    //         return; // Invalid move
    //     }
    // }

    changePot(delta){
        if (delta){
            this.pot += delta;
        }
    }


    // this will reset the board and the bets
    clearBets(){
        // refund any bets placed
        if (this.totalBet > 0){
            console.log("Refunding bets", this.totalBet);

            this.changePot(this.totalBet);
            this.addChips(this.totalBet);


        }

        this.totalBet = 0;
        this.targets.forEach(cell => {
            cell.classList.remove('bet');
            cell.dataset.betValue = 0;
        })

        // since no bets not spinning
        this.board.classList.remove("can-spin");

    }

    placeBet(el, amount){

        // prevent placing a bet if the board is spinning
        if (this.is_betting) return;

        if (this.spins < 1 ) return;


        if (amount > this.pot) return;

        // add an amount to a specific bet square
        //  and set some styling
        el.classList.add('bet')
        el.dataset.betValue = parseInt(el.dataset.betValue) + amount;

        // take the amount from the pot
        // (refunded if cancelled)
        this.totalBet += amount
        this.changePot( amount * -1);

        this.board.classList.add("can-spin");

    }

    // END OF BETTING

    clearBoard(){
        this.board.querySelectorAll('.roulette-cell').forEach(cell => {
            cell.classList.remove('win');
            // cell.dataset.betValue = 0
        });
    };


    calcBetWin(cell, isFinal = false) {
        // work out if someone bet on this winning cell
        // return their total winnings
        if (isFinal){
            cell.classList.add('win');
        }

        if (cell.classList.contains('bet')){
            let winnings = (parseInt(cell.dataset.betOdds) +1) * parseInt(cell.dataset.betValue)

            if (isFinal){
                popWinnings(cell, winnings)
            }

            return winnings
        }else{
            return 0;
        };
    };




    highlightBoard(segment) {

        // show which cells are winners
        let cell = this.board.querySelector(`[data-value="${segment.text}"]`)
        cell.classList.add('win');

        // Replace the $SELECTION_PLACEHOLDER$ with the function call
        let winnings = this.calculateWinnings(segment, true);

        console.log("Winnings calculated:", winnings, segment.text);


        setTimeout(() => {

            this.totalBet = 0;

            const newLi = document.createElement("li");
            newLi.textContent = segment.text;
            newLi.style.backgroundColor = segment.originalFillStyle;

            this.boardScoresList.prepend(newLi);

            setTimeout(() => {

                this.is_betting = false;
                this.changePot(winnings);
                this.addChips(winnings);
                this.clearBoard();
                this.clearBets();
                //determine if the game is over
                this.checkGameOver();

            }, 1750)

        },1000)

    }

    calculateWinnings(segment, isFinal = false) {
        let winnings = 0;

        // Calculate red/black wins
        if (segment.originalFillStyle == this.RED_COLOR) {
            let cell = this.board.querySelector(`[data-value="Red"]`);
            winnings += this.calcBetWin(cell, isFinal);
        } else if (segment.originalFillStyle == this.BLACK_COLOR) {
            let cell = this.board.querySelector(`[data-value="Black"]`);
            winnings += this.calcBetWin(cell, isFinal);
        }

        // Calculate other wins
        let num = segment.value;

        if (num <= 36) {

            // Evens / Odds
            let evenOdd = (num % 2 === 0) ? 'Even' : 'Odd';
            let cell = this.board.querySelector(`[data-value="${evenOdd}"]`);
            winnings += this.calcBetWin(cell, isFinal);

            // Half-Boards
            evenOdd = (num < 19) ? '1-18' : '19-36';
            cell = this.board.querySelector(`[data-value="${evenOdd}"]`);
            winnings += this.calcBetWin(cell, isFinal);

            // Third-Boards
            if (num < 13) {
                cell = this.board.querySelector(`[data-value="1st 12"]`);
                winnings += this.calcBetWin(cell, isFinal);
            } else if (num < 25) {
                cell = this.board.querySelector(`[data-value="2nd 12"]`);
                winnings += this.calcBetWin(cell, isFinal);
            } else {
                cell = this.board.querySelector(`[data-value="3rd 12"]`);
                winnings += this.calcBetWin(cell, isFinal);
            }

            // columns
            let row = num % 3
            if (row == 1) {
                cell = this.board.querySelector(`[data-value="2 to 1 (1st col)"]`);
                winnings += this.calcBetWin(cell, isFinal);
            } else if (row == 2) {
                cell = this.board.querySelector(`[data-value="2 to 1 (2nd col)"]`);
                winnings += this.calcBetWin(cell, isFinal);
            } else if (row == 0){
                cell = this.board.querySelector(`[data-value="2 to 1 (3rd col)"]`);
                winnings += this.calcBetWin(cell, isFinal);
            }

        }

        return winnings;

    }


    checkGameOver(){
        if (this.pot <= 0 || this.spins <= 0) {
            alert('Game Over')
        }

    }

    // WHEEL RELATED
    showWheel(show) {
        this.wheelContainer.style.opacity = show ? 1 : 0;
        this.wheelContainer.style.zIndex = show ? 2 : 0;
        this.board.style.opacity = show ? .1 : 1;
    }


    rouletteSegments = this.americanRouletteNumbers.map(number => {

        let color = this.getRouletteColor(number)

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

    wheel = new Winwheel({
        numSegments: this.rouletteSegments.length,
        segments: Array.from(this.rouletteSegments),
        textFontSize: 20,
        background:'white',
        outerRadius: 350,
        innerRadius: 150,
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
            duration: 12,
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


    resetWheel() {

        if (this.is_wheel_spinning) return;

        // give the wheel a random angle to start with
        this.wheel.rotationAngle = parseInt(Math.random() * 360);

        // Reset all segments to original colors
        this.wheel.segments.slice(1).forEach(segment => {
            if (segment)
                segment.fillStyle = segment.originalFillStyle;
                segment.textFillStyle = 'white';
                segment.textFontSize = 20;
        });

        // Clear previous text from the middle
        const ctx = this.wheel.canvas.getContext("2d");
        ctx.clearRect(0, 0, this.wheel.canvas.width, this.wheel.canvas.height);
        this.wheel.draw(false);


        // Reset ball
        this._setTheOddsballAngle = 0;

        // drawBall(ballAngle, 0);
        this.is_wheel_spinning = false;
        // reset the board
        this.clearBoard();

    };


    highlightSegment(segment) {
        if (segment) {
            segment.fillStyle = 'yellow';
            segment.textFillStyle = 'black',
            // consider more visuals like background color
            segment.textFontSize = 42
        }
        this.wheel.draw(false); // Apply the highlight
        this.drawBall(this.ballAngle, 1);
    }


    // SPINNING LOGIC

    spinWheel() {

        if (this.is_wheel_spinning) return;

        if (this.spins < 1) return;

        this.is_betting = true;
        this.resetWheel();
        this.showWheel(true);

        this.is_wheel_spinning = true;
        
        this.handleGetInsight();

        this.spins -= 1        

        this.n_turns = 6 + (Math.random() * 2)

        let ballAnimationTime = this.wheel.animation.duration * (1 + Math.random() * 0.5);

        this.animateBall(ballAnimationTime, null);
        // wheel.startAnimation();

        // let res = this.calcBetEfficiency()

        // console.log("Bet efficiency:", res);

    }


    determineBallSegment(ballAngle) {

        // Final angles
        const wheelAngle = this.wheel.rotationAngle % 360;

        const ballFinalAngle = (360 - (ballAngle % 360)) % 360; // Normalize to 0–360

        // Combine angles to get effective angle
        const effectiveAngle = (ballFinalAngle + wheelAngle ) % 360;

        console.log("Ball angle:", ballAngle, "Wheel angle:", wheelAngle, "Final ball angle:", ballFinalAngle);
        console.log("Effective angle:", effectiveAngle);

        // Find segment
        const segments = this.wheel.segments.slice(1);
        const anglePerSegment = 360 / segments.length;

        const index = Math.floor(effectiveAngle / anglePerSegment) + 1;

        const selectedSegment = segments[segments.length - index]  ;

        console.log("Selected segment index:", index, "Angle:", effectiveAngle);

        this.drawBall(ballAngle, 1)

        console.log("Ball landed on:", selectedSegment.text, ballAngle);

        // Display the result text in the center of the canvas
        const ctx = this.wheel.canvas.getContext("2d");

        // Clear previous text
        ctx.clearRect(0, 0, this.wheel.canvas.width, this.wheel.canvas.height);

        // Set font and alignment
        ctx.font = "bold 56px 'Segoe UI', sans-serif";  // Choose a nice readable font
        ctx.fillStyle = selectedSegment.fillStyle || "#000";  // Use segment color or fallback to black
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";

        // Draw text in center
        ctx.fillText(
            selectedSegment.text,
            this.wheel.canvas.width / 2,
            this.wheel.canvas.height / 2
        );

        return selectedSegment;

        // You could display this in the UI or highlight it.
    }


    // BALL
    drawBall(angle, progress) {

        // TODO: only once at start ..
        const inner = this.wheel.innerRadius + 8
        const outer = this.wheel.outerRadius - 16

        const r = (outer) - (progress * (outer - inner)); // slightly inside the edge

        const x = this.wheel.centerX + r * Math.cos(angle);
        const y = this.wheel.centerY + r * Math.sin(angle);

        const ctx = this.wheel.ctx;

        // console.log('drawing ball',x,y)
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


    easeOutQuart(t) {
        return 1 - Math.pow(1 - t, 4);
    }


    animateBall(durationSeconds, onComplete) {

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

        // for when the ball stops moving
        this.finalBallAngle = null;
        this.finalWheelAngle = null;

        // calculate the degrees in a segment
        this.segmentDegrees = parseInt(360 / this.wheel.segments.length -1);

        const frame = (now) =>  {

            const elapsed = now - startTime;
            const progress = Math.min(elapsed / (durationSeconds * 1000), 1);

            //return 1 - Math.pow(1 - t, 3); // cubic ease out
            let easedProgress = 1 - Math.pow(1 - progress, 2.5);

            let easedWheelProgress = 1 - Math.pow(1 - progress, 1.5);

            this.wheel.rotationAngle = this.n_turns * 360 * easedWheelProgress;

            this.ballAngle = initialAngle + totalRotation * easedProgress;

            // only change the ball angle until 95% done
            if (easedProgress > 0.995){
                // now we want to fix the ball where it is
                // so it doesn't move anymore
                // console.log("Finalizing ball position at", easedProgress, totalRotation, initialAngle);
                if (this.finalBallAngle == null){

                    // here we should make any small adjustments to the ball angle so that it exactly center of a segment

                    this.finalBallAngle = this.ballAngle;
                    this.finalWheelAngle = this.wheel.rotationAngle;

                    let ballAngleDegrees = (this.ballAngle * 180) / Math.PI

                    // This is all for ticking and playing sound
                    let segment = ((ballAngleDegrees + 90) / this.segmentDegrees) % this.wheel.segments.length;

                    // we want to round this to the nearest middle of a segment
                    // 3.8 goes to 4
                    let offset = (this.segmentDegrees / 2) - Math.floor((ballAngleDegrees % this.segmentDegrees)) ;

                    this.finalBallAngle += (offset * Math.PI) / 180; // convert to radians

                    console.log("Stopping ball animation at segment", segment, this.finalBallAngle, this.finalWheelAngle);

                }
                // this is in radians!
                // so we need to convert the wheel angle change to radians
                const wheelAngleChangeRadians = ((this.finalWheelAngle - this.wheel.rotationAngle) * Math.PI) / 180;
                this.ballAngle = this.finalBallAngle - wheelAngleChangeRadians

            }

            // Redraw without re-animating: we do the animation ourselves
            this.wheel.draw(false);

            this.drawBall(this.ballAngle, easedProgress);

            let ballAngleDegrees = (this.ballAngle * 180) / Math.PI

            // This is all for ticking and playing sound
            let segment = Math.floor((ballAngleDegrees + 90) / this.segmentDegrees) % this.wheel.segments.length;

            // we only want to play the sound if the ball has passed a segment
            if ((segment != last_segment)&&(!this.finalBallAngle)) playSound();

            last_segment = segment;

            // console.log("Ball animation angle:", ballAngle, ballAngleDegrees,  initialAngle , totalRotation , easedProgress);

            if (progress < 1) {
                requestAnimationFrame(frame);
            } else {

                console.log("Ball animation completed", ballAngleDegrees);
                const finalSegment = this.determineBallSegment(ballAngleDegrees + 90 );

                console.log("FINAL SEGEMENT", finalSegment)
                this.is_wheel_spinning = false;
                this.highlightSegment(finalSegment);
                this.showWheel(false);
                this.highlightBoard(finalSegment);

            }
        }

        requestAnimationFrame(frame);

    }

    calcBetEfficiency() {
        // Calculate the efficiency of the bets placed
        // based on the total bet and the pot value
        if (this.totalBet <= 0) return 0;

        // we need to calculate the expected payout
        // based on the odds of the bets placed
        let expectedPayout = 0;

        this.rouletteSegments.forEach(cell => {

            let thisWin = (this.calculateWinnings(cell) - this.totalBet ) * 1/38;
            expectedPayout += thisWin

        });

        const efficiency = (expectedPayout / this.totalBet) * 100;
        return Math.min(efficiency, 100); // Cap at 100%

    }
    
    
    // --- Gemini API Integration ---
    async handleGetInsight() {

                // const totalBetOnSquare = parseInt(squareElement.dataset.total) || 0;
                // let remainingChipsSummary = chipDenominations
                //     .filter(denom => denom.quantity > 0)
                //     .map(denom => `$${denom.value} chips: ${denom.quantity}`)
                //     .join(', ');
                // if (!remainingChipsSummary) {
                //     remainingChipsSummary = "no chips remaining";
                // }

                // const prompt = `You are a fun and slightly quirky casino game commentator. I'm playing a game where I place chips on betting squares. For one specific square (Square ${squareId + 1}), I have currently placed a total bet of $${totalBetOnSquare}. My remaining chips are: ${remainingChipsSummary}. Give me a short, entertaining insight or piece of advice for my bet on Square ${squareId + 1}. Keep it to 1-2 sentences. Be creative and a bit playful!`;
                
                const insightDisplayElement = document.querySelector('.insight-area');

                
                if (!insightDisplayElement) {
                    console.error("Insight display element not found.");
                    return;
                }

                insightDisplayElement.innerHTML = `
                    <div class="spinner-border spinner-border-sm text-light" role="status">
                        <span class="visually-hidden">Loading...</span>
                    </div> Getting insight...`;                
                    insightDisplayElement.classList.remove('d-none');                


                    var question = Array.from(this.targets)
                        .filter(cell => parseInt(cell.dataset.betValue) > 0)
                        .map(cell => `Bet $${cell.dataset.betValue} on ${cell.dataset.value}`)
                        .join(', ');
                    
                    question += ` with a total of $${this.pot} left in the bank and ${this.spins} spins remaining.`;

                    var requestBody = { question };

                try {

                    const apiUrl = "roulette/chat"
                    
                    console.log("Fetching insight from Gemini API...");
                    
                    const queryParams = new URLSearchParams(requestBody).toString();

                    const response = await fetch(`${apiUrl}?${queryParams}`, {
                        method: 'GET',
                    });

                    
                    if (!response.ok) {
                        const errorData = await response.json();
                        console.error("Gemini API Error:", errorData);
                        throw new Error(`API request failed with status ${response.status}: ${errorData.error?.message || 'Unknown error'}`);
                    }

                    const text = await response.text();
                    
                    insightDisplayElement.textContent = text;

                    // if (result.candidates && result.candidates.length > 0 &&
                    //     result.candidates[0].content && result.candidates[0].content.parts &&
                    //     result.candidates[0].content.parts.length > 0) {
                    //     const text = result.candidates[0].content.parts[0].text;
                    //     insightDisplayElement.textContent = text;
                    // } else {
                    //     console.error("Unexpected response structure from Gemini API:", result);
                    //     insightDisplayElement.textContent = "Couldn't get an insight right now. Maybe the stars aren't aligned?";
                    // }
                } catch (error) {
                    console.error('Error fetching Gemini insight:', error);
                    insightDisplayElement.textContent = "Oops! Couldn't fetch an insight. Check the console for details.";
                }

                // Hide the spinner after a short delay     
                setTimeout(() => {
                    insightDisplayElement.classList.add('d-none');
                }, 8000); // Hide after 5 seconds
            }
}
