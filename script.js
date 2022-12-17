(() => {
    const width = 1024;
    let height = 0;

    let video = null;
    let canvas = null;
    let photo = null;
    let captureButton = null;
    let photoList = null;

    function load() {
        video = document.getElementById("video");
        canvas = document.getElementById("canvas");
        photo = document.getElementById("photo");
        captureButton = document.getElementById("captureButton");
        photoList = document.getElementById("photoList");

        navigator.mediaDevices
            .getUserMedia({
                            video: {
                              facingMode: { exact: "environment" }
                            }
                          })
            .then((stream) => {
                video.srcObject = stream;
                video.play();
            })
            .catch((err) => {
                console.error(`An error occurred: ${err}`);
            });

        video.addEventListener(
            "canplay",
            (ev) => {
                height = video.videoHeight / (video.videoWidth / width);

                video.setAttribute("width", width);
                video.setAttribute("height", height);
                canvas.setAttribute("width", width);
                canvas.setAttribute("height", height);

                clearPhoto();
            }
        );

        captureButton.addEventListener(
            "click",
            (ev) => {
                takePhoto();
                ev.preventDefault();
            }
        );

        clearPhoto();
    }

    function clearPhoto() {
        const context = canvas.getContext("2d");
        context.fillStyle = "#CCC";
        context.fillRect(0, 0, canvas.width, canvas.height);

        const data = canvas.toDataURL("image/png");
        photo.setAttribute("src", data);
    }

    function takePhoto() {
        const context = canvas.getContext("2d");
        canvas.width = width;
        canvas.height = height;
        context.drawImage(video, 0, 0, width, height);

        const data = canvas.toDataURL("image/png");
        photo.setAttribute("src", data);

        const newPhoto = document.createElement("img");
        newPhoto.setAttribute("src", data);
        photoList.appendChild(newPhoto);
    }

    window.addEventListener("load", load, false);
})();