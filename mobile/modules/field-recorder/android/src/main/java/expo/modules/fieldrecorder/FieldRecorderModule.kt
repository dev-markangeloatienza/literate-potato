package expo.modules.fieldrecorder

import android.media.AudioFormat
import android.media.AudioRecord
import android.media.MediaRecorder
import android.media.AudioManager
import android.content.Context
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition
import java.io.RandomAccessFile
import java.io.File
import java.nio.ByteBuffer
import java.nio.ByteOrder
import java.security.MessageDigest

class FieldRecorderModule : Module() {
  @Volatile private var running = false
  private var input: AudioRecord? = null
  private var worker: Thread? = null
  private var path: String? = null
  @Volatile private var failure: Exception? = null
  private var audioManager: AudioManager? = null
  private val focusListener = AudioManager.OnAudioFocusChangeListener { change ->
    if (change == AudioManager.AUDIOFOCUS_LOSS || change == AudioManager.AUDIOFOCUS_LOSS_TRANSIENT) running = false
  }
  override fun definition() = ModuleDefinition {
    Name("FieldRecorder")
    AsyncFunction("sha256File") { uri: String ->
      val file = File(uri.removePrefix("file://"))
      val filesDir = appContext.reactContext?.filesDir ?: throw IllegalStateException("App storage unavailable")
      check(file.canonicalPath.startsWith(filesDir.canonicalPath + File.separator)) { "Model must use app storage" }
      val digest = MessageDigest.getInstance("SHA-256")
      file.inputStream().use { input ->
        val buffer = ByteArray(256 * 1024)
        while (true) { val count=input.read(buffer); if(count<0)break; digest.update(buffer,0,count) }
      }
      digest.digest().joinToString("") { byte -> "%02x".format(byte.toInt() and 0xff) }
    }
    AsyncFunction("start") { uri: String ->
      check(worker == null) { "Recording already active" }
      val file = File(uri.removePrefix("file://"))
      val filesDir = appContext.reactContext?.filesDir ?: throw IllegalStateException("App storage unavailable")
      check(file.canonicalPath.startsWith(filesDir.canonicalPath + File.separator)) { "Recording must use app storage" }
      file.parentFile?.mkdirs()
      val bufferSize = maxOf(4096, AudioRecord.getMinBufferSize(16000, AudioFormat.CHANNEL_IN_MONO, AudioFormat.ENCODING_PCM_16BIT))
      val source = AudioRecord(MediaRecorder.AudioSource.MIC, 16000, AudioFormat.CHANNEL_IN_MONO, AudioFormat.ENCODING_PCM_16BIT, bufferSize)
      if(source.state != AudioRecord.STATE_INITIALIZED) { source.release(); throw IllegalStateException("Microphone could not initialize") }
      audioManager = appContext.reactContext?.getSystemService(Context.AUDIO_SERVICE) as? AudioManager
      val focus = audioManager?.requestAudioFocus(focusListener, AudioManager.STREAM_MUSIC, AudioManager.AUDIOFOCUS_GAIN_TRANSIENT)
      if (focus != AudioManager.AUDIOFOCUS_REQUEST_GRANTED) { source.release(); throw IllegalStateException("Audio is in use by another app") }
      path = uri; failure = null; input = source
      try { source.startRecording() } catch (e: Exception) { source.release(); input = null; audioManager?.abandonAudioFocus(focusListener); audioManager=null; throw e }
      running = true
      worker = Thread {
        try {
          RandomAccessFile(file, "rw").use { out ->
            out.setLength(0); out.write(ByteArray(44))
            val buffer = ByteArray(bufferSize)
            var total = 0
            while (running && total < 16000 * 2 * 60) {
              val n = source.read(buffer, 0, minOf(buffer.size, 16000 * 2 * 60 - total))
              if (n < 0) throw IllegalStateException("Microphone interrupted")
              if (n > 0) { out.write(buffer, 0, n); total += n }
            }
            val header = ByteBuffer.allocate(44).order(ByteOrder.LITTLE_ENDIAN)
            header.put("RIFF".toByteArray()).putInt(total + 36).put("WAVEfmt ".toByteArray()).putInt(16)
            header.putShort(1).putShort(1).putInt(16000).putInt(32000).putShort(2).putShort(16)
            header.put("data".toByteArray()).putInt(total)
            out.seek(0); out.write(header.array()); out.fd.sync()
          }
        } catch (e: Exception) { failure = e } finally { running = false }
      }.also { it.start() }
    }
    AsyncFunction("stop") { finish() }
    Function("isRecording") { running }
    OnDestroy { try { finish() } catch (_: Exception) {} }
  }
  @Synchronized private fun finish(): String {
    running = false
    worker?.join(3000)
    try { input?.stop() } catch (_: Exception) {}
    worker?.join(1000)
    input?.release(); input = null; worker = null
    audioManager?.abandonAudioFocus(focusListener); audioManager = null
    failure?.let { throw it }
    return path ?: throw IllegalStateException("No recording")
  }
}
