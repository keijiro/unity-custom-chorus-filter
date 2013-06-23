#pragma strict

@Range(0.0, 200.0)
var delayMs = 20.0;

@Range(0.0, 20.0)
var frequencyHz = 0.4;

@Range(0.0, 200.0)
var depthMs = 12.0;

@Range(0.0, 1.0)
var amplifier = 0.666666666;

@Range(0.0, 1.0)
var feedback = 0.3;

@Range(0.0, 1.0)
var stereo = 0.5;

private var bufferSize = 64 * 1024;

private var buffer1 : float[];
private var buffer2 : float[];

private var position = 0;

private var delay = 100.0;
private var depth = 100.0;

private var phi = 0.0;
private var deltaPhi = 2.0 / 44800;

private var error = "";

function Awake() {
	buffer1 = new float[bufferSize];
	buffer2 = new float[bufferSize];
	UpdateParameters();
}

function UpdateParameters() {	
	var sampleRate = AudioSettings.outputSampleRate;
	delay = sampleRate * delayMs / 1000;
	depth = sampleRate * depthMs / 2000;
	deltaPhi = Mathf.PI * 2 * frequencyHz / sampleRate;
}

function Update() {
	if (error) {
		Debug.LogError(error);
		Destroy(this);
	} else {
		UpdateParameters();
	}
}

function OnAudioFilterRead(data:float[], channels:int) {
	if (channels != 2) {
		error = "This filter only supports stereo audio (given:" + channels + ")";
		return;
	}
	
	for (var i = 0; i < data.Length; i += 2) {
		buffer1[position] = data[i];
		buffer2[position] = data[i + 1];

		var move = Mathf.Sin(phi);

		var offset1 = delay + (1.0 + move) * depth;
		var offset2 = delay + (1.0 - move) * depth;
		var offset1i : int = offset1;
		var offset2i : int = offset2;
		var offset1f = offset1 - offset1i;
		var offset2f = offset2 - offset2i;
		
		var s1a = buffer1[(position + bufferSize - offset1i    ) & (bufferSize - 1)];
		var s1b = buffer1[(position + bufferSize - offset1i - 1) & (bufferSize - 1)];
		var s2a = buffer2[(position + bufferSize - offset2i    ) & (bufferSize - 1)];
		var s2b = buffer2[(position + bufferSize - offset2i - 1) & (bufferSize - 1)];
		
		var add1 = s1a * (1.0 - offset1f) + s1b * offset1f;
		var add2 = s2a * (1.0 - offset2f) + s2b * offset2f;
		
		data[i    ] = (data[i    ] + add1 * (0.5 + stereo * 0.5) + add2 * (1.0 - stereo) * 0.5) * amplifier;
		data[i + 1] = (data[i + 1] + add2 * (0.5 + stereo * 0.5) + add1 * (1.0 - stereo) * 0.5) * amplifier;

		buffer1[position] += data[i]     * feedback;
		buffer2[position] += data[i + 1] * feedback;

		position = (position + 1) & (bufferSize - 1);

		phi += deltaPhi;
	}
	while (phi > Mathf.PI * 2) phi -= Mathf.PI * 2;
}
