require 'rubygems'
require 'sane' # require_relative
require_relative 'jruby-swing-helpers/swing_helpers'

include SwingHelpers
  
class MainWindow < JFrame

  def show_blocking_message_dialog(message, title = message.split("\n")[0], style= JOptionPane::INFORMATION_MESSAGE)
    # I think I'm already on top...
    setVisible(true);
    toFront()
    JOptionPane.showMessageDialog(nil, message, title, style)
    true
  end

  def initialize
      super "countdown"
      set_size 150,100
      setDefaultCloseOperation JFrame::EXIT_ON_CLOSE # happiness
      @jlabel = JLabel.new 'Welcome to Sensible Cinema!'
      happy = Font.new("Tahoma", Font::PLAIN, 11)
      @jlabel.setFont(happy)
      @jlabel.set_bounds(44,44,160,14)
      panel = JPanel.new
      @panel = panel
      @buttons = []
      panel.set_layout nil
      add panel # why can't I just slap these down?
      panel.add @jlabel
      @start_time = Time.now
      @jlabel.set_text 'welcome...'
      
      starting_seconds_requested = ARGV[0].to_f*60
      @switch_image_timer = javax.swing.Timer.new(1000, nil) # nil means it has no default person to call when the action has occurred...
      @switch_image_timer.add_action_listener do |e|
        seconds_left = starting_seconds_requested - (Time.now - @start_time)
        if seconds_left < 0
          setState ( java.awt.Frame::NORMAL )
          setVisible(true)
          toFront()
          show_blocking_message_dialog "timer done!"
          @start_time = Time.now
        else
          # avoid weird re-draw issues
          minutes = (seconds_left/60).to_i          
          if minutes > 0
            current_time = "%02d:%02d" % [minutes, seconds_left % 60]
          else
            current_time = "%02ds" % [seconds_left % 60]
          end
          @jlabel.set_text current_time
          set_title current_time
        end
      end
      @switch_image_timer.start
      self.always_on_top=true
  end
  
  end

if $0 == __FILE__
  if ARGV.length == 0
    p 'syntax: minutes1 minutes2 [it will loop, for pomodoro]'
  else
    MainWindow.new.show
  end
end

