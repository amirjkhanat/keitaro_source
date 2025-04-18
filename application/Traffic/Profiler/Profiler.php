<?php
/*
 * @ https://EasyToYou.eu - IonCube v11 Decoder Online
 * @ PHP 7.2
 * @ Decoder version: 1.0.4
 * @ Release: 01/09/2021
 */

namespace Traffic\Profiler;

class Profiler
{
    private $_previousMemory = NULL;
    private $_previousTime = NULL;
    private $_previousSqlCount = NULL;
    private $_format = "[{label}] {time} {rpm} {sql_count}, {memory} ({memory_diff})";
    public function __construct()
    {
        $this->resetState();
    }
    public function resetState()
    {
        $this->_previousTime = microtime(true);
        $this->_previousMemory = memory_get_usage();
        $this->_previousSqlCount = \Core\Db\Db::instance()->getQueriesCount();
    }
    public function step($label, $requests = NULL)
    {
        $memory = memory_get_usage();
        $time = microtime(true);
        $sqlCount = \Core\Db\Db::instance()->getQueriesCount();
        $params = [];
        $params["label"] = $label;
        $params["time"] = $this->_getTime($time);
        if (!empty($requests)) {
            $params["rpm"] = $this->_getRpm($requests, $time - $this->_previousTime);
        } else {
            $params["rpm"] = "";
        }
        $params["memory"] = $this->_getMemory($memory);
        $params["memory_diff"] = $this->_getMemoryDiff($memory);
        $params["sql_count"] = $this->_getSqlCount($sqlCount);
        $this->_previousTime = $time;
        $this->_previousMemory = $memory;
        $this->_previousSqlCount = $sqlCount;
        return $this->_preformat($params);
    }
    public function enableXhprof()
    {
        $xhprof = \Traffic\Service\ConfigService::instance()->get("system", "xhprof_path");
        if ($xhprof) {
            require_once $xhprof;
        }
    }
    public function disableXhprof()
    {
        if (function_exists("xhprof_disable")) {
            xhprof_disable();
        }
    }
    private function _getTime($now)
    {
        return number_format($now - $this->_previousTime, 3) . " sec.";
    }
    private function _getRpm($requests, $time)
    {
        return ceil($requests / $time * 60) . " RPM.";
    }
    private function _getMemoryDiff($memory)
    {
        $diff = $memory - $this->_previousMemory;
        $symbol = 0 < $diff ? "+" : "-";
        return $symbol . $this->_getMemory($diff);
    }
    private function _getMemory($memory)
    {
        return $this->_formatMemory($memory) . "MB";
    }
    private function _getSqlCount($cnt)
    {
        return $cnt - $this->_previousSqlCount . " sql queries";
    }
    private function _formatMemory($value)
    {
        return ceil($value / 1024 / 1025);
    }
    private function _preformat($params)
    {
        $str = $this->_format;
        foreach ($params as $key => $val) {
            $str = str_replace("{" . $key . "}", $val, $str);
        }
        return $str;
    }
}

?>