import React, { useEffect, useState, useRef } from "react";
import {
  bootstrapCameraKit,
  createMediaStreamSource,
  Transform2D,
} from "@snap/camera-kit";
import {
  GestureRecognizer,
  FilesetResolver,
  DrawingUtils,
} from "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest";

let mediaStream;

const CombinedComponent = () => {
  const canvasRef = useRef(null);
  const gestureOutputRef = useRef(null);
  const cameraSelectRef = useRef(null);
  const lensSelectRef = useRef(null);
  const canvasGesRef = useRef(null);
  const videoRef = useRef(null);
  const videoHeight = "0px";
  const videoWidth = "0px";

  const [gestureRecognizer, setGestureRecognizer] = useState(null);
  const [runningMode, setRunningMode] = useState("IMAGE");
  const [webcamRunning, setWebcamRunning] = useState(false);

  const apiToken = process.env.REACT_APP_API_TOKEN;
  const lensGroupId = process.env.REACT_APP_LENS_GROUP_ID;

  // Gesture Code --- START

  useEffect(() => {
    const createGestureRecognizer = async () => {
      const vision = await FilesetResolver.forVisionTasks(
        "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest/wasm"
      );

      const recognizer = await GestureRecognizer.createFromOptions(vision, {
        baseOptions: {
          modelAssetPath:
            "https://storage.googleapis.com/mediapipe-models/gesture_recognizer/gesture_recognizer/float16/1/gesture_recognizer.task",
          delegate: "GPU",
        },
        runningMode: runningMode,
      });

      setGestureRecognizer(recognizer);
      document.getElementById("demos").classList.remove("invisible");
    };

    createGestureRecognizer();
  }, [runningMode]);

  const handleClick = async (event) => {
    if (!gestureRecognizer) {
      alert("Please wait for gestureRecognizer to load");
      return;
    }

    if (runningMode === "VIDEO") {
      setRunningMode("IMAGE");
      await gestureRecognizer.setOptions({ runningMode: "IMAGE" });
    }
    const allCanvas = event.target.parentNode.getElementsByClassName("canvas");
    for (let i = allCanvas.length - 1; i >= 0; i--) {
      const n = allCanvas[i];
      n.parentNode.removeChild(n);
    }

    const results = gestureRecognizer.recognize(event.target);

    console.log(results);

    if (results.gestures.length > 0) {
      const p = event.target.parentNode.childNodes[3];
      p.setAttribute("class", "info");

      const categoryName = results.gestures[0][0].categoryName;
      const categoryScore = parseFloat(
        results.gestures[0][0].score * 100
      ).toFixed(2);
      const handedness = results.handednesses[0][0].displayName;

      p.innerText = `GestureRecognizer: ${categoryName}\n Confidence: ${categoryScore}%\n Handedness: ${handedness}`;
      p.style =
        "left: 0px;" +
        "top: " +
        event.target.height +
        "px; " +
        "width: " +
        (event.target.width - 10) +
        "px;";

      const canvas = document.createElement("canvas");
      canvas.setAttribute("class", "canvas");
      canvas.setAttribute("width", event.target.naturalWidth + "px");
      canvas.setAttribute("height", event.target.naturalHeight + "px");
      canvas.style =
        "left: 0px;" +
        "top: 0px;" +
        "width: " +
        event.target.width +
        "px;" +
        "height: " +
        event.target.height +
        "px;";

      event.target.parentNode.appendChild(canvas);
      const canvasCtx = canvas.getContext("2d");
      const drawingUtils = new DrawingUtils(canvasCtx);
      for (const landmarks of results.landmarks) {
        drawingUtils.drawConnectors(
          landmarks,
          GestureRecognizer.HAND_CONNECTIONS,
          {
            color: "#00FF00",
            lineWidth: 5,
          }
        );
        drawingUtils.drawLandmarks(landmarks, {
          color: "#FF0000",
          lineWidth: 1,
        });
      }
    }
  };

  const enableCam = async (event) => {
    if (!gestureRecognizer) {
      alert("Please wait for gestureRecognizer to load");
      return;
    }

    setWebcamRunning((prevState) => !prevState);
    if (!webcamRunning) {
      event.target.innerText = "DISABLE PREDICTIONS";
    } else {
      event.target.innerText = "ENABLE PREDICTIONS";
    }

    const constraints = {
      video: true,
    };

    try {
      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      videoRef.current.srcObject = stream;
      videoRef.current.addEventListener("loadeddata", predictWebcam);
    } catch (error) {
      console.error("Error accessing webcam:", error);
    }
  };

  let lastVideoTime = -1;
  let results = undefined;

  const predictWebcam = () => {
    const webcamElement = videoRef.current;
    const canvasCtx = canvasGesRef.current.getContext("2d"); // Corrected line
    const canvasElement = canvasGesRef.current;
    const gestureOutput = gestureOutputRef.current;

    if (runningMode === "IMAGE") {
      setRunningMode("VIDEO");
      gestureRecognizer.setOptions({ runningMode: "VIDEO" });
    }
    let nowInMs = Date.now();
    if (webcamElement.currentTime !== lastVideoTime) {
      lastVideoTime = webcamElement.currentTime;
      results = gestureRecognizer.recognizeForVideo(webcamElement, nowInMs);
    }

    canvasCtx.save();
    canvasCtx.clearRect(0, 0, canvasElement.width, canvasElement.height);
    const drawingUtils = new DrawingUtils(canvasCtx);

    canvasElement.style.height = videoHeight;
    webcamElement.style.height = videoHeight;
    canvasElement.style.width = videoWidth;
    webcamElement.style.width = videoWidth;

    if (results.landmarks) {
      for (const landmarks of results.landmarks) {
        drawingUtils.drawConnectors(
          landmarks,
          GestureRecognizer.HAND_CONNECTIONS,
          {
            color: "#00FF00",
            lineWidth: 5,
          }
        );
        drawingUtils.drawLandmarks(landmarks, {
          color: "#FF0000",
          lineWidth: 2,
        });
      }
    }
    canvasCtx.restore();
    if (results.gestures.length > 0) {
      gestureOutput.style.display = "block";
      gestureOutput.style.width = videoWidth;
      const categoryName = results.gestures[0][0].categoryName;
      const categoryScore = parseFloat(
        results.gestures[0][0].score * 100
      ).toFixed(2);
      const handedness = results.handednesses[0][0].displayName;
      gestureOutput.innerText = `GestureRecognizer: ${categoryName}\n Confidence: ${categoryScore} %\n Handedness: ${handedness}`;
    } else {
      gestureOutput.style.display = "none";
    }
    if (webcamRunning === true) {
      window.requestAnimationFrame(predictWebcam);
    }
  };

  // Gesture Code --- END

  // Snap --- START

  useEffect(() => {
    const init = async () => {
      const cameraKit = await bootstrapCameraKit({ apiToken: apiToken });

      const session = await cameraKit.createSession();

      // Use the ref to get the canvas element
      const canvas = canvasRef.current;
      if (canvas) {
        canvas.replaceWith(session.output.live);
      }
      const { lenses } = await cameraKit.lenses.repository.loadLensGroups([
        lensGroupId,
      ]);
      session.applyLens(lenses[19]);
      await setCameraKitSource(session);
      await attachCamerasToSelect(session);
      console.log("attachCamerasToSelect is called");
      await attachLensesToSelect(lenses, session);
      console.log("attachLensesToSelect is called");
    };

    init();
  }, []);

  const setCameraKitSource = async (session, deviceId) => {
    if (mediaStream) {
      session.pause();
      mediaStream.getVideoTracks()[0].stop();
    }

    mediaStream = await navigator.mediaDevices.getUserMedia({
      video: { deviceId },
    });

    const source = createMediaStreamSource(mediaStream);

    await session.setSource(source);

    source.setTransform(Transform2D.MirrorX);

    session.play();
  };

  const attachCamerasToSelect = async (session) => {
    cameraSelectRef.current.innerHTML = "";
    const devices = await navigator.mediaDevices.enumerateDevices();
    const cameras = devices.filter(({ kind }) => kind === "videoinput");

    cameras.forEach((camera) => {
      const option = document.createElement("option");
      option.value = camera.deviceId;
      option.text = camera.label;
      cameraSelectRef.current.appendChild(option);
    });

    cameraSelectRef.current.addEventListener("change", (event) => {
      const deviceId = event.target.selectedOptions[0].value;
      setCameraKitSource(session, deviceId);
    });
  };

  const attachLensesToSelect = async (lenses, session) => {
    lensSelectRef.current.innerHTML = "";
    lenses.forEach((lens) => {
      const option = document.createElement("option");
      option.value = lens.id;
      option.text = lens.name;
      lensSelectRef.current.appendChild(option);
    });

    lensSelectRef.current.addEventListener("change", (event) => {
      const lensId = event.target.selectedOptions[0].value;
      const lens = lenses.find((lens) => lens.id === lensId);
      if (lens) session.applyLens(lens);
    });
  };

  // Snap --- END

  return (
    <div>
      {/* SNAP --- START */}
      <div className="container">
        {/* <canvas ref={canvasRef} id="canvas-container" width="1920" height="1080"></canvas> */}
        <div className="footer">
          <p id="gesture_output" className="output" ref={gestureOutputRef}></p>
          <select ref={cameraSelectRef} className="styled-select"></select>
          <select ref={lensSelectRef} className="styled-select"></select>
        </div>
      </div>
      {/* SNAP --- END */}
      {/* GES --- START */}
      <div>
        <section id="demos">
          {/* <h2>Demo: Recognize gestures</h2>
        <p><em>Click on an image below</em> to identify the gestures in the image.</p> */}

          <div className="detectOnClick">
            <p className="classification removed"></p>
          </div>
          <div className="detectOnClick">
            <p className="classification removed"></p>
          </div>

          <div id="liveView" className="videoView">
            <button
              id="webcamButton"
              className="mdc-button mdc-button--raised"
              onClick={enableCam}
            >
              <span className="mdc-button__ripple"></span>
              <span className="mdc-button__label">
                {webcamRunning ? "DISABLE PREDICTIONS" : "ENABLE PREDICTIONS"}
              </span>
            </button>
            <div style={{ position: "relative" }}>
              <canvas
                ref={canvasRef}
                id="canvas-container"
                width="1920"
                height="1080"
              ></canvas>
              <video
                id="webcam"
                autoPlay
                playsInline
                ref={videoRef}
                style={{ display: "none" }}
              ></video>
              <canvas
                className="output_canvas"
                id="output_canvas"
                width={videoWidth}
                height={videoHeight}
                ref={canvasGesRef}
                style={{ position: "absolute", left: "0px", top: "0px" }}
              ></canvas>
              <p
                id="gesture_output"
                className="output"
                ref={gestureOutputRef}
              ></p>
            </div>
          </div>
        </section>
      </div>
      {/* GES --- END */}
    </div>
  );
};

export default CombinedComponent;
