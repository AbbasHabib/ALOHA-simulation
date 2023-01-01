const PacketState = {
    NO_PACKET: 0,
    IN_PROGRESS: 1,
    IN_PROGRESS_COLLIDED: 2
}

TRANSMIT_PROBABILITY=20;
FRAME_TIME_STEPS=3;


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
            line += `<td>h</td>`;
        }

        this.#stations.forEach((st)=>{
            let transmission_line = `<tr id="transmission_line${st.getId()}">
            ${line}
            </tr>`
            this.#transmissionLinesView.innerHTML += transmission_line;
        });
    }

    updateTransmissionLineView(){
        this.#stations.forEach((st)=>{

            st.getTransmissionLineData().forEach((packetSlot, index)=>{
                let slot = document.querySelector(`#transmission_line${st.getId()} td:nth-child(${index+1})`);
                if(slot){
                    if(packetSlot == PacketState.IN_PROGRESS_COLLIDED){
                        slot.style.backgroundColor = "red";
                    }
                    else if(packetSlot == PacketState.IN_PROGRESS){
                        slot.style.backgroundColor = "green";
                    }
                    else{
                        slot.style.backgroundColor = "grey";
                    }
                }
            });

        });


    }
}

class Station{
    #delayBeforeSending;
    #stationId;
    #propagatedFrame
    #transmissionLineData;
    #packetState;
    constructor(stationId, transmissionLineSize){
        this.#delayBeforeSending=Math.floor(Math.random() * TRANSMIT_PROBABILITY);
        this.#stationId = stationId;
        this.#propagatedFrame=0;
        this.#transmissionLineData=Array(transmissionLineSize).fill(0);
        this.#packetState = PacketState.NO_PACKET;
    }

    isAvailableToSend(){
        return (!this.isTransmitting() && this.isBackOffTimeOver())
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
                this.#updateTime()
            }
        }
        else{
            this.#updateTime()
            this.#transmissionLineData[0] = PacketState.NO_PACKET;
            this.#packetState = PacketState.NO_PACKET;
            this.#propagatedFrame =0;
        }
        console.log( this.#stationId + " -> " + this.#packetState)
    }

    #updateTime(){
            // if the station is not transmitting
            // decreament back off time
            // update state to no packet being transferred
            if(this.#delayBeforeSending > 0){
                this.#delayBeforeSending -= 1;
            }
            else{
                // when timer is over reset it
                this.#delayBeforeSending=Math.floor(Math.random() * TRANSMIT_PROBABILITY);

            }
    }

    getId(){
        return this.#stationId;
    }
    getTransmissionLineData(){
        return this.#transmissionLineData;
    }
    setPacketStateToCollided(){
        this.#packetState =  PacketState.IN_PROGRESS_COLLIDED;
        this.#markPreviousFrameSlotsAsCollided()
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

    sendFrame(){
        this.#propagatedFrame = FRAME_TIME_STEPS;
        this.#packetState = PacketState.IN_PROGRESS;
    }

    getcurrentPacketState(){
        return this.#packetState;
    }

    isBackOffTimeOver(){
        return (this.#delayBeforeSending == 0)
    }
};


const shiftArray =(arr)=> {
    return arr.map((_, i, a) => a[(i + a.length - 1) % a.length]);
}

const createNstation = (stations, n, lineSize) =>{
    for(let id = 1; id <= n; id++){
        stations.push(new Station(stationId=id, transmissionLineSize=lineSize))
    }
}

const sleep = (ms) => {
    return new Promise(resolve => setTimeout(resolve, ms));
}


const simulateStations = (stations, viewController) =>{
    totalCollisions = 0;

    (async () => {
    while(true){
        await sleep(500);
        collisions=0;
        transmittingStationsAtCurrentTime = [];

        // for each station check if the have a packet to send
        stations.forEach((st)=>{
            if(st.isAvailableToSend()){
                st.sendFrame();
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
        console.log("update!!!")
        await sleep(500);
    }})()

}


const begin =()=> {

    let stations = [];

    createNstation(stations=stations, n=3, lineSize=30);

    // console.log(stations);

    viewController = new ViewController(stations);

    viewController.generateTransmissionLine(lineSize=30);
    viewController.updateTransmissionLineView();

    simulateStations(stations, viewController);

}
// fun1()
begin();