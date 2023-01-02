const PacketState = {
    NO_PACKET: 0,
    IN_PROGRESS: 1,
    IN_PROGRESS_COLLIDED: 2
}

const SimulateState={
    IN_PROGRESS : 0,
    STOPPED: 1
}

MAX_BACKOFF_TIME=60;
MIN_BACKOFF_TIME=0;
FRAME_TIME_STEPS=3;
WAIT_TIME_MILLI_SEC=500;
TIME_LINE_SLOTS=70;

LAMBDA=6;
NO_STATIONS=6;


SIMULATION_STATE = SimulateState.IN_PROGRESS;


const fact=(x)=>{
    if(x==0) {
       return 1;
    }
    return x * fact(x-1);
 }

const poisson =(k, lamda)=>{
    var exponential = 2.718281828;
    exponentialPower = Math.pow(exponential, -lamda);
    lamdaPowerK = Math.pow(lamda, k);
    numerator = exponentialPower * lamdaPowerK;
    denominator = fact(k);
    return (numerator / denominator);
}


class ViewController{
    #stations
    #transmissionLinesView
    constructor(stations){
        this.#stations = stations;
        this.#transmissionLinesView = document.getElementById("transmissionLines");
    }

    generateTransmissionLine(lineSize,clean=true){
        let line = "";

        if(clean){
            this.#transmissionLinesView.innerHTML = "";
        }
        for(let i=0 ; i < lineSize; i++){
            line += `<td></td>`;
        }


        this.#stations.forEach((st)=>{
            let transmission_line = `<tr id="transmission_line${st.getId()}">
            <td id="station_logo${st.getId()}"><img src="station.png" id="station_img" alt="station${st.getId()}"></td>
            ${line}
            <td id="left_packets${st.getId()}"></td>
            </tr>`
            this.#transmissionLinesView.innerHTML += transmission_line;
        });
    }

    updateCollisionAndSuccessCount(collisionCount, successCount){
        document.getElementById("collisions_count").innerText = collisionCount.toString();
        document.getElementById("success_count").innerText = successCount.toString();
        let totalCount = (successCount + collisionCount);
        document.getElementById("total_count").innerText = totalCount.toString();

        if(totalCount != 0)
            document.getElementById("efficiency").innerText = Math.round(successCount / totalCount * 100.0).toFixed(5).toString();
    }


    updateTransmissionLineView(){
        this.#stations.forEach((st)=>{
            st.getTransmissionLineData().forEach((packetSlot, index)=>{
                let slot = document.querySelector(`#transmission_line${st.getId()} td:nth-child(${index+2})`);
                if(packetSlot == PacketState.IN_PROGRESS_COLLIDED){
                    slot.style.backgroundColor = "red";
                }
                else if(packetSlot == PacketState.IN_PROGRESS){
                    slot.style.backgroundColor = "green";
                }
                else{
                    slot.style.backgroundColor = "grey";
                }
                let inProgressPackets = document.querySelector(`#left_packets${st.getId()}`);
                inProgressPackets.innerText = st.getNoOfQueuedPackets()
            });
        });
    }
}

class Station{
    // #delayBeforeSending;
    #stationId;
    #propagatedFrame
    #transmissionLineData;
    #packetState;
    #noOfQueuedPackets;
    constructor(stationId, transmissionLineSize, noOfQueuedPackets){
        this.#noOfQueuedPackets = noOfQueuedPackets;
        this.#stationId = stationId;
        this.#propagatedFrame=0;
        this.#transmissionLineData=Array(transmissionLineSize).fill(0);
        this.#packetState = PacketState.NO_PACKET;
        // this.#resetBackOffTimer();
    }

    isAvailableToSend(){
        // return (!this.isTransmitting() && this.#isBackOffTimeOver());
        return (!this.isTransmitting() && this.#checkProbablityToSend());
    }


    #checkProbablityToSend(){
        return(poisson(NO_STATIONS, LAMBDA) > Math.random());
    }

    getNoOfQueuedPackets(){
        return this.#noOfQueuedPackets;
    }

    countTimeStep(){
        this.#transmissionLineData = shiftArray(this.#transmissionLineData);
        // in case of transmitting
        if(this.#propagatedFrame != 0){
            // fill transmission line with data
            if(this.#packetState == PacketState.IN_PROGRESS_COLLIDED){
                this.#transmissionLineData[0] = PacketState.IN_PROGRESS_COLLIDED;
            }
            else{
                this.#transmissionLineData[0] = PacketState.IN_PROGRESS;
            }
            // remove the transmitted section from the propageted frame
            this.#propagatedFrame -=1;

            if(this.#propagatedFrame === 0)
            {
                this.#packetState = PacketState.NO_PACKET;
                // this.#updateTime()
            }
        }
        else{
            // this.#updateTime()
            this.#transmissionLineData[0] = PacketState.NO_PACKET;
            this.#packetState = PacketState.NO_PACKET;
            this.#propagatedFrame =0;
        }
        console.log( this.#stationId + " -> " + this.#packetState)
    }

    // #updateTime(){
    //         // if the station is not transmitting
    //         // decreament back off time
    //         // update state to no packet being transferred
    //         if(this.#delayBeforeSending > 0){
    //             this.#delayBeforeSending -= 1;
    //         }
    //         else{
    //             // when timer is over reset it
    //             this.#resetBackOffTimer();
    //         }
    // }

    // #resetBackOffTimer(){
    //     this.#delayBeforeSending=Math.floor(Math.random() * MAX_BACKOFF_TIME + MIN_BACKOFF_TIME);
    // }

    getId(){
        return this.#stationId;
    }
    getTransmissionLineData(){
        return this.#transmissionLineData;
    }
    setPacketStateToCollided(){
        this.#packetState =  PacketState.IN_PROGRESS_COLLIDED;
        // revert packet withdrawl
        this.#noOfQueuedPackets += 1;
        this.#markPreviousFrameSlotsAsCollided();
    }

    #markPreviousFrameSlotsAsCollided(){
        console.log("=>" +this.#propagatedFrame)
        for(let i = 0; i < FRAME_TIME_STEPS - this.#propagatedFrame; i++){
            this.#transmissionLineData[i] = PacketState.IN_PROGRESS_COLLIDED;
        }
    }

    isTransmitting(){
        return (this.#packetState === PacketState.IN_PROGRESS || this.#packetState === PacketState.IN_PROGRESS_COLLIDED)
    }

    transmitPacket(){
        this.#noOfQueuedPackets -= 1;
        this.#propagatedFrame = FRAME_TIME_STEPS;
        this.#packetState = PacketState.IN_PROGRESS;
    }

    getcurrentPacketState(){
        return this.#packetState;
    }

    // isBackOffTimeOver(){
    //     return (this.#delayBeforeSending == 0)
    // }
};


const shiftArray =(arr)=> {
    return arr.map((_, i, a) => a[(i + a.length - 1) % a.length]);
}

const createNstation =(stations, n, noPackets,lineSize)=>{
    for(let id = 1; id <= n; id++){
        stations.push(new Station(stationId=id, transmissionLineSize=lineSize,noOfQueuedPackets = noPackets))
    }
}

const sleep =(ms)=> {
    return new Promise(resolve => setTimeout(resolve, ms));
}


const simulateStations = (stations, viewController) =>{
    totalCollisions = 0;
    totalAttempts = 0;
    effeciencyValues = new Array(1).fill(0);
    xAxis = new Array(1).fill(1);
    (async () => {
    while(SIMULATION_STATE === SimulateState.IN_PROGRESS){
        collisions=0;
        transmittingStationsAtCurrentTime = [];

        // for each station check if the have a packet to send
        stations.forEach((st)=>{
            if(st.isAvailableToSend()){
                st.transmitPacket();
                totalAttempts+=1;
            }

            if(st.isTransmitting()){
                transmittingStationsAtCurrentTime.push(st);
            }
        });

        // for each station was transmitting if no. of transmitting stations was > 1
        // update the packets to the collided state
        if(transmittingStationsAtCurrentTime.length > 1){
            transmittingStationsAtCurrentTime.forEach(collidedStation => {
                // check if the packet wasn't already marked as collided
                if(collidedStation.getcurrentPacketState() != PacketState.IN_PROGRESS_COLLIDED){
                    collisions +=1;
                    // update packet state
                    collidedStation.setPacketStateToCollided();
                }
            });
        }

        // for each station count one time step
        stations.forEach((st)=>{
            st.countTimeStep();
        });

        totalCollisions += collisions;
        viewController.updateTransmissionLineView()
        viewController.updateCollisionAndSuccessCount(collisionCount = totalCollisions, successCount = totalAttempts - collisionCount);
        // if(effeciencyValues.length >= 10){
        //     effeciencyValues.shift();
        // }
        effeciencyValues.push(Math.round((totalAttempts - collisionCount) / totalAttempts * 100.0).toFixed(5));
        xAxis.push(xAxis[xAxis.length -1] + 1);

        drawPlot(effeciencyValues);
        waitingTime = WAIT_TIME_MILLI_SEC;
        await sleep(waitingTime);
    }})()
}


const begin =(noStations)=> {

    let stations = [];

    // createNstation(stations=stations, n=noStations, noPackets=poisson(noStations, 0.2),lineSize=TIME_LINE_SLOTS);
    createNstation(stations=stations, n=noStations, noPackets=1000,lineSize=TIME_LINE_SLOTS);

    // console.log(stations);

    viewController = new ViewController(stations);

    viewController.generateTransmissionLine(lineSize=TIME_LINE_SLOTS);
    viewController.updateTransmissionLineView();

    simulateStations(stations, viewController);

}

const update =()=>{
    (async () => {
        SIMULATION_STATE = SimulateState.STOPPED;
        console.log("updating")
        await sleep(WAIT_TIME_MILLI_SEC + WAIT_TIME_MILLI_SEC + 1000);
        FRAME_TIME_STEPS = parseInt(document.getElementById("frame_size").value);
        LAMBDA = parseInt(document.getElementById("lambda").value);
        NO_STATIONS = parseInt(document.getElementById("no_stations").value);
        WAIT_TIME_MILLI_SEC = parseInt(document.getElementById("trns_speed").value);

        console.log("FRAME_TIME_STEPS" + FRAME_TIME_STEPS);
        console.log("MAX_BACKOFF_TIME" + MAX_BACKOFF_TIME);
        console.log("MIN_BACKOFF_TIME" + MIN_BACKOFF_TIME);
        console.log("LAMBDA" + LAMBDA);
        console.log("NO_STATIONS" + NO_STATIONS);
        console.log("WAIT_TIME_MILLI_SEC"  + WAIT_TIME_MILLI_SEC);

        if(MIN_BACKOFF_TIME > MAX_BACKOFF_TIME){
            MIN_BACKOFF_TIME = 0;
        }

        SIMULATION_STATE = SimulateState.IN_PROGRESS;

        begin(NO_STATIONS);

    })();
}

function drawPlot(yAxis, xAxis){
    TESTER = document.getElementById('tester');
    Plotly.newPlot( TESTER, [{
    x: xAxis,
    y: yAxis }], {
    margin: { t: 0 } } );
}



// console.log(poisson(4, 4) * 100);


// console.log(poisson(20, 0.3));
// console.log(poisson(6, 6));
// console.log(poisson(6, 2.0));
// console.log(poisson(2, 0.9));
// console.log(poisson(6, 0.6));